import Joi from "joi"
import type { ValidationResult } from "../../domain"
import { validationResultToPromise } from "../../utils/to-promise"
import { validateJoi } from "./default"
import { validateJoiAsync } from "./async"

type SignUpForm = {
  firstName: string
  lastName: string
}

describe("validateJoi", () => {
  const schema = Joi.object<SignUpForm>().keys({
    firstName: Joi.string().required().min(2).max(100),
    lastName: Joi.string().required(),
  })
  it("should validate plain multiple fields", () => {
    const validator = validateJoi(schema)

    const value = {
      firstName: "John",
      lastName: "Doe",
    }
    const result = validator(value)

    if (result.status !== "success") {
      throw new Error("Not a success status")
    }

    expect(result).toStrictEqual({
      status: "success",
      value,
    })
  })

  it("should invalidate plain multiple fields", () => {
    const validator = validateJoi(schema)
    const value = {
      firstName: "",
      lastName: "Doe",
    }
    const result = validator(value)

    expect(result.status).toBe("error")
    expect(result).toStrictEqual({
      status: "error",
      error: '"firstName" is not allowed to be empty',
      value,
      children: {
        firstName: {
          status: "error",
          error: '"firstName" is not allowed to be empty',
          value: "",
          children: {},
        },
      },
    })
  })

  it("should validate plain multiple fields", () => {
    const schema = Joi.object().keys({
      a: Joi.object().keys({
        b: Joi.object().keys({
          c: Joi.string().required().allow("hello").only(),
          d: Joi.string().required().allow("world").only(),
        }),
        e: Joi.string().required().allow("how").only(),
      }),
      f: Joi.object().keys({
        j: Joi.array().items(
          Joi.object().keys({
            x: Joi.string().required().allow("hello").only(),
            y: Joi.string().required().allow("world").only(),
          }),
          Joi.object().keys({
            x: Joi.string().required().allow("hello").only(),
            y: Joi.string().required().allow("world").only(),
          }),
        ),
        h: Joi.string().required().allow("how").only(),
      }),
    })

    type DeepSchema = {
      a: { b: { c: string; d: string }; e: string }
      f: { j: { x: string; y: string }[]; h: string }
    }

    const validator = validateJoi<DeepSchema>(schema)

    const resultGood = validator({
      a: {
        b: {
          c: "hello",
          d: "world",
        },
        e: "how",
      },
      f: {
        j: [
          { x: "hello", y: "world" },
          { x: "hello", y: "world" },
        ],
        h: "how",
      },
    })

    expect(resultGood.status).toBe("success")

    const resultBad = validator({
      a: {
        b: {
          c: "world",
          d: "hello",
        },
        e: "ww",
      },
      f: {
        j: [
          { x: "hello", y: "world" },
          { x: "hello", y: "world" },
        ],
        h: "how",
      },
    })

    expect(resultBad).toMatchObject({
      status: "error",
      children: {
        a: {
          status: "error",
          children: {
            b: {
              status: "error",
              children: {
                c: { status: "error" },
                d: { status: "error" },
              },
            },
            e: { status: "error" },
          },
        },
      },
    })
  })
})

describe("validateJoiAsync", () => {
  const allowedValue = "test"

  const externalImpl: Joi.ExternalValidationFunction = async (value, { message }) => {
    if (value === allowedValue) return value
    return message("Invalid value" as any)
  }

  const externalFn = jest.fn().mockImplementation(externalImpl)

  const schema = Joi.object<SignUpForm>({
    firstName: Joi.string().required(),
    lastName: Joi.string().required().external(externalFn),
  })

  afterEach(() => {
    externalFn.mockClear()
  })

  it("should validate object with external function", async () => {
    const results: ValidationResult<SignUpForm>[] = []
    const validator = validateJoiAsync(schema)
    const value = { firstName: "qwe", lastName: allowedValue }
    const result$ = validator(value)
    const sub = result$.subscribe(x => results.push(x))
    const result = await validationResultToPromise(result$)
    expect(result).toStrictEqual({ status: "success", value })

    expect(results.length).toEqual(2)
    expect(results[0].status).toEqual("validating")
    expect(results[1].status).toEqual("success")
    expect(externalFn.mock.calls.length).toEqual(1)

    sub.unsubscribe()
  })

  it("should invalidate object with external function", async () => {
    const results: ValidationResult<SignUpForm>[] = []
    const validator = validateJoiAsync(schema)
    const value = { firstName: "qwe", lastName: "42" }
    const result$ = validator(value)
    const sub = result$.subscribe(x => results.push(x))

    const result = await validationResultToPromise(result$)
    expect(result).toStrictEqual({
      status: "error",
      value,
      error: "Invalid value",
      children: {
        lastName: {
          status: "error",
          children: {},
          error: "Invalid value",
          value: "42",
        },
      },
    })

    expect(results.length).toEqual(2)
    expect(results[0].status).toEqual("validating")
    expect(results[1].status).toEqual("error")
    expect(externalFn.mock.calls.length).toEqual(1)

    sub.unsubscribe()
  })
})
