import { Atom } from "@rixio/atom"
import { CacheFulfilled, CacheIdle, CachePending } from "../../domain"
import { save } from "."

describe("save", () => {
	it("should save value", async () => {
		expect.assertions(3)
		const data$ = Atom.create(CacheIdle.create())
		const promise = save(new Promise(r => setTimeout(() => r(10), 100)), data$)
		expect(data$.get()).toStrictEqual(CachePending.create())
		expect(await promise).toBe(10)
		expect(data$.get()).toStrictEqual(CacheFulfilled.create(10))
	})
})
