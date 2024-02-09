import type { ObjectSchema } from "joi"
import Joi from "joi"
import { delay, first, reduce, switchMap, take, takeWhile } from "rxjs/operators"
import { Atom, byKeyFactory } from "@rixio/atom"
import type { Observable } from "rxjs"
import { EMPTY, of } from "rxjs"
import type { ValidateFn, ValidationResult } from "../domain"
import { validateJoi } from "../adapters/joi"
import { FormStore } from "./index"

const validateOptions = ["sync", "observable", "promise"] as const
type ValidateOption = (typeof validateOptions)[number]

class StubForm<T extends object> {
  readonly atom$ = Atom.create<T>(this.defaultValue)
  constructor(private readonly schema: ObjectSchema<T>, private readonly defaultValue: T) {}

  getValidation = (option: ValidateOption): ValidateFn<T> => {
    const syncValidate = validateJoi(this.schema)
    switch (option) {
      case "sync":
        return syncValidate
      case "observable":
        return value =>
          of(null).pipe(
            delay(16),
            switchMap(() => of(syncValidate(value))),
          )
      case "promise":
        return value =>
          of(null)
            .pipe(
              delay(16),
              switchMap(() => of(syncValidate(value))),
              take(1),
            )
            .toPromise()
      default:
        throw new Error("Unknown type")
    }
  }
}

type SignUpData = {
  firstName: string
  lastName: string
}

function signUpSchema() {
  return Joi.object<SignUpData>().keys({
    firstName: Joi.string().required().min(2).max(100),
    lastName: Joi.string().required(),
  })
}

type SignUpByKeyData = {
  [K in string]: SignUpData
}

function signUpByKeySchema() {
  return Joi.object<SignUpByKeyData>({}).pattern(Joi.string(), signUpSchema)
}

describe("FormStore", () => {
  it.each(validateOptions)("create FormStore and perform %s validation", async option => {
    const signUpForm = new StubForm(signUpSchema(), { lastName: "Doe", firstName: "" })
    const form = FormStore.create(signUpForm.atom$, signUpForm.getValidation(option))
    const firstNameStore = form.bind("firstName")

    const badResult = await firstNameStore.validationResult
      .pipe(
        switchMap(x => (x.status === "error" ? of(x) : EMPTY)),
        first(),
      )
      .toPromise()
    expect(badResult.error).toBe('"firstName" is not allowed to be empty')

    signUpForm.atom$.lens("firstName").set("John")

    const goodResult = await firstNameStore.validationResult
      .pipe(
        switchMap(x => (x.status === "success" ? of(x) : EMPTY)),
        first(),
      )
      .toPromise()
    expect(goodResult.status).toBe("success")
  })

  it.each(validateOptions)("should display validating status while perform %s validation", async option => {
    const signUpForm = new StubForm(signUpSchema(), { lastName: "Doe", firstName: "" })
    const form = FormStore.create(signUpForm.atom$, signUpForm.getValidation(option))

    const tillError = await collectTill(form.validationResult, "error")
    if (option === "sync") {
      expect(tillError.length).toBe(1)
      expect(tillError[0].status).toBe("error")
    } else {
      expect(tillError.length).toBe(2)
      expect(tillError[0].status).toBe("validating")
      expect(tillError[1].status).toBe("error")
    }
  })

  it.each(validateOptions)("validating %s should be emitted after success", async option => {
    const signUpForm = new StubForm(signUpSchema(), { lastName: "Doe", firstName: "John" })
    const form = FormStore.create(signUpForm.atom$, signUpForm.getValidation(option))

    if (option === "sync") {
      const goodResult = await collectTill(form.validationResult, "success")
      expect(goodResult.length).toBe(1)
      expect(goodResult[0].status).toBe("success")

      form.value.lens("firstName").set("")
      form.value.lens("lastName").set("")
      const badResult = await collectTill(form.validationResult, "error")
      expect(badResult.length).toBe(2)
      expect(badResult[1].status).toBe("error")
    } else {
      const results1 = await collectTill(form.validationResult, "success")
      expect(results1.length).toBe(2)
      expect(results1[0].status).toBe("validating")
      expect(results1[1].status).toBe("success")

      form.value.lens("firstName").set("")
      form.value.lens("lastName").set("")
      const results2 = await collectTill(form.validationResult, "error")
      expect(results2.length).toBe(3)
      expect(results2[2].status).toBe("error")
    }
  })

  it.each(validateOptions)("should validate %s with custom lens", async option => {
    const signUpForm = new StubForm(signUpByKeySchema(), {})
    const lensFactory = byKeyFactory((): SignUpData => ({ firstName: "", lastName: "" }))
    const form = FormStore.create(Atom.create({}), signUpForm.getValidation(option))
    const theKey = "the-key"
    const binded = form.lens(theKey, (x, value) => value.lens(lensFactory(x)))

    const firstName$ = binded.value.lens("firstName")
    const lastName$ = binded.value.lens("lastName")

    // No value before the first getter through the lens
    expect(form.value.get()).toStrictEqual({})

    expect(firstName$.get()).toEqual("")
    expect(lastName$.get()).toEqual("")

    firstName$.set("John")
    lastName$.set("Doe")

    expect(form.value.get()).toStrictEqual({
      [theKey]: {
        firstName: "John",
        lastName: "Doe",
      },
    })

    expect(firstName$.get()).toEqual("John")
    expect(lastName$.get()).toEqual("Doe")

    const goodResult = await collectTill(form.validationResult, "success")
    if (option === "sync") {
      expect(goodResult.length).toBe(1)
      expect(goodResult[0].status).toBe("success")
    } else {
      expect(goodResult.length).toBe(2)
      expect(goodResult[0].status).toBe("validating")
      expect(goodResult[1].status).toBe("success")
    }
  })
})

function collectTill<T>(vr: Observable<ValidationResult<T>>, status: ValidationResult<T>["status"]) {
  return vr
    .pipe(
      takeWhile(x => x.status !== status, true),
      reduce<ValidationResult<T>, ValidationResult<T>[]>((xs, x) => [...xs, x], []),
    )
    .toPromise()
}
