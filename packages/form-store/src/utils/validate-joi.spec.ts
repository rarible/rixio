import Joi from "joi"
import { validateJoi } from ".."

describe("validate-joi", () => {
	test("should validate plain multiple fields", () => {
		const schema = Joi.object().keys({
			firstName: Joi.string().required().min(2).max(100),
			lastName: Joi.string().required(),
		})

		const validator = validateJoi<{ firstName?: string; lastName?: string }>(schema)

		const resultGood = validator({
			firstName: "qwe",
			lastName: "eee",
		})

		expect(resultGood.status).toBe("success")

		const resultBad = validator({
			firstName: "",
		})

		expect(resultBad.status).toBe("error")
		if (resultBad.status !== "error") throw new Error()

		expect(resultBad.children.firstName).toBeDefined()
		expect(resultBad.children.firstName?.status).toBe("error")

		expect(resultBad.children.lastName).toBeDefined()
		expect(resultBad.children.lastName?.status).toBe("error")
	})

	test("should validate plain multiple fields", () => {
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
					})
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
					{ x: "world", y: "hello" },
					{ x: "world", y: "hello" },
				],
				h: "how",
			},
		})

		expect(resultBad).toMatchObject<any>({
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
				f: {
					status: "error",
					children: {
						j: {
							status: "error",
							children: {
								0: { status: "error" },
								1: { status: "error" },
							},
						},
					},
				},
			},
		})
	})
})
