import Joi from "joi"
import { filter, first, map, reduce, takeWhile } from "rxjs/operators"
import { Atom } from "@rixio/atom"
import { Lens } from "@rixio/lens"
import { Observable, timer } from "rxjs"
import { ValidationResult, ValidationResultError, ValidationResultSuccess, ValidationStatus } from "./domain"
import { validateJoi } from "./utils/validate-joi"
import { FormStore } from "./index"

interface SignUpFormSchema {
	firstName: string
	lastName: string
}

class SignUpForm {
	readonly schema = Joi.object<SignUpFormSchema>().keys({
		firstName: Joi.string().required().min(2).max(100),
		lastName: Joi.string().required(),
	})

	readonly validation = validateJoi<SignUpFormSchema>(this.schema)
	readonly asyncValidation = (value: SignUpFormSchema) =>
		new Promise<ValidationResult<SignUpFormSchema>>(r => setTimeout(() => r(this.validation(value)), 100))

	getAtom = (value: SignUpFormSchema = createDefaultSignUpForm()) => Atom.create<SignUpFormSchema>(value)
}

class KeyedForm<T> {
	constructor(private readonly childSchema: Joi.ObjectSchema<T>, private readonly getDefault: (key: string) => T) {}

	private readonly schema = Joi.object({}).pattern(Joi.string(), this.childSchema)
	readonly validation = validateJoi<Record<string, T>>(this.schema)

	getLensByKey = (key: string) =>
		Lens.create<Record<string, T>, T>(
			s => s[key] || this.getDefault(key),
			(s, xs) => {
				xs[key] = s
				return xs
			}
		)
}

function collectTill<T>(vr: Observable<ValidationResult<T>>, status: ValidationStatus) {
	return vr
		.pipe(
			takeWhile(x => x.status !== status, true),
			reduce<ValidationResult<T>, ValidationResult<T>[]>((xs, x) => [...xs, x], []),
			first()
		)
		.toPromise()
}

describe("FormStore", () => {
	const signUpForm = new SignUpForm()

	it("create FormStore and perform validation", async () => {
		expect.assertions(2)
		const atom = signUpForm.getAtom()
		const form = FormStore.create(atom, signUpForm.validation)
		const firstNameValidation = form.bind("firstName").validationResult

		const withError = await firstNameValidation
			.pipe(
				filter(x => x.status === "error"),
				map(x => x as ValidationResultError<string>),
				first()
			)
			.toPromise()
		expect(withError.error).toBe('"firstName" is not allowed to be empty')

		atom.modify(it => ({
			...it,
			firstName: "First Name",
		}))
		const success = await firstNameValidation
			.pipe(
				filter(x => x.status === "success"),
				map(x => x as ValidationResultSuccess),
				first()
			)
			.toPromise()
		expect(success.status).toBe("success")
	})

	it("should display validating status while perform async validation", async () => {
		expect.assertions(3)
		const atom = signUpForm.getAtom()
		const form = FormStore.create(atom, signUpForm.asyncValidation)

		const tillError = await collectTill(form.validationResult, "error")
		expect(tillError.length).toBe(2)
		expect(tillError[0].status).toBe("validating")
		expect(tillError[1].status).toBe("error")
	})

	it("should display validating status while perform async validation (with Observable)", async () => {
		const atom = signUpForm.getAtom()
		const validate = (form: SignUpFormSchema): Observable<ValidationResult<SignUpFormSchema>> => {
			return timer(0, 1000).pipe(
				map(x => {
					if (x > 0) {
						return {
							status: "error",
							error: "some value",
							children: {},
						}
					} else {
						return {
							status: "success",
						}
					}
				})
			)
		}

		const form = FormStore.create(atom, validate)
		await collectTill(form.validationResult, "success")
		const tillError = await collectTill(form.validationResult, "error")
		expect(tillError.length).toBe(2)
		expect(tillError[0].status).toBe("success")
		expect(tillError[1].status).toBe("error")
	})

	it("if there is error, no validation status should be emitted", async () => {
		expect.assertions(7)
		const atom = signUpForm.getAtom()
		const form = FormStore.create(atom, signUpForm.asyncValidation)

		const results1 = await collectTill(form.validationResult, "error")
		expect(results1.length).toBe(2)
		expect(results1[0].status).toBe("validating")
		expect(results1[1].status).toBe("error")

		atom.lens("firstName").set("First name")
		atom.lens("lastName").set("Last name")
		const results2 = await collectTill(form.validationResult, "success")
		expect(results2.length).toBe(3)
		expect(results2[0].status).toBe("error")
		expect(results2[1].status).toBe("error")
		expect(results2[2].status).toBe("success")
	})

	it("validating should be emitted after success", async () => {
		expect.assertions(6)
		const atom = signUpForm.getAtom(createDefaultSignUpForm("First name", "Last name"))
		const form = FormStore.create(atom, signUpForm.asyncValidation)
		const results1 = await collectTill(form.validationResult, "success")
		expect(results1.length).toBe(2)
		expect(results1[0].status).toBe("validating")
		expect(results1[1].status).toBe("success")
		atom.lens("firstName").set("")
		atom.lens("lastName").set("")

		const results2 = await collectTill(form.validationResult, "error")
		expect(results2.length).toBe(2)
		expect(results2[0].status).toBe("validating")
		expect(results2[1].status).toBe("error")
	})

	it("should work with custom lens", async () => {
		expect.assertions(7)
		const keyed = new KeyedForm(signUpForm.schema, () => createDefaultSignUpForm())
		const atom = Atom.create({})
		const form = FormStore.create(atom, keyed.validation)
		const binded = form.bind("unknown-key", keyed.getLensByKey)

		const firstName$ = binded.value.lens("firstName")
		const lastName$ = binded.value.lens("lastName")
		expect(firstName$.get()).toEqual("")
		expect(lastName$.get()).toEqual("")

		firstName$.set("John")
		lastName$.set("Doe")

		expect(firstName$.get()).toEqual("John")
		expect(lastName$.get()).toEqual("Doe")

		expect(atom.get()).toEqual({
			"unknown-key": createDefaultSignUpForm("John", "Doe"),
		})

		binded.bind("firstName").value.set("John")
		binded.bind("lastName").value.set("Doe")

		const results2 = await collectTill(form.validationResult, "success")
		expect(results2.length).toBe(1)
		expect(results2[0].status).toBe("success")
	})
})

function createDefaultSignUpForm(firstName = "", lastName = ""): SignUpFormSchema {
	return {
		firstName,
		lastName,
	}
}
