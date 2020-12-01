import { first } from "rxjs/operators"
import { of } from "rxjs"
import { rxObject } from "./rx-object"

describe("rxObject", () => {
	test("should work with plain objects", async () => {
		const value = await rxObject({ key: "value" }).pipe(first()).toPromise()
		expect(value.status).toBe("fulfilled")
		expect((value as any).value.key).toBe("value")
	})

	test("should work with one observable", async () => {
		const num = Math.random()
		const value = await rxObject({ key: "value", obs: of(num) })
			.pipe(first())
			.toPromise()
		expect(value.status).toBe("fulfilled")
		expect((value as any).value.key).toBe("value")
		expect((value as any).value.obs).toBe(num)
	})

	test("should work with some observables", async () => {
		const num = Math.random()
		const num2 = Math.random()
		const value = await rxObject({ key: "value", obs: of(num), obs2: of(num2) })
			.pipe(first())
			.toPromise()
		expect(value.status).toBe("fulfilled")
		expect((value as any).value.key).toBe("value")
		expect((value as any).value.obs).toBe(num)
		expect((value as any).value.obs2).toBe(num2)
	})
})
