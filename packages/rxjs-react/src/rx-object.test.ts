import { rxObject } from "./rx-object"
import { first } from "rxjs/operators"
import { of } from "rxjs"

describe("rxObject", () => {
	test("should work with plain objects", async () => {
		const value = await rxObject({ key: "value" }).pipe(first()).toPromise()
		expect(value.key).toBe("value")
	})

	test("should work with one observable", async () => {
		const num = Math.random()
		const value = await rxObject({ key: "value", obs: of(num) }).pipe(first()).toPromise()
		expect(value.key).toBe("value")
		expect(value.obs).toBe(num)
	})
})
