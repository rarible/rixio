import { Atom } from "@rixio/atom"
import { CacheIdle, CacheState } from "../../domain"
import { save } from "."

describe("save", () => {
	it("should save value", async () => {
		const result: CacheState<number>["status"][] = []
		const data$ = Atom.create(CacheIdle.create())
		const sub = data$.subscribe(x => result.push(x.status))
		expect(result.length).toEqual(1)
		expect(result[0]).toEqual("idle")
		const promise = save(new Promise(r => setTimeout(() => r(10), 100)), data$)
		expect(result.length).toEqual(2)
		expect(result[1]).toEqual("pending")
		await expect(promise).resolves.toEqual(10)
		expect(result.length).toEqual(3)
		expect(result[2]).toEqual("fulfilled")

		sub.unsubscribe()
	})

	it("should throw error", async () => {
		const result: CacheState<number>["status"][] = []
		const data$ = Atom.create(CacheIdle.create())
		const sub = data$.subscribe(x => result.push(x.status))
		expect(result.length).toEqual(1)
		expect(result[0]).toEqual("idle")
		const promise = save(new Promise((_, r) => setTimeout(() => r(10), 100)), data$)
		expect(result.length).toEqual(2)
		expect(result[1]).toEqual("pending")
		await expect(promise).rejects.toEqual(10)
		expect(result.length).toEqual(3)
		expect(result[2]).toEqual("rejected")

		sub.unsubscribe()
	})

	it("result from save should be the same as promise's result", async () => {
		expect.assertions(1)
		const data$ = Atom.create(CacheIdle.create())
		const originalPromise = new Promise(r => setTimeout(() => r(10), 100))
		const promise = save(originalPromise, data$)
		const originalResult = await originalPromise
		const promiseResult = await promise
		expect(originalResult).toEqual(promiseResult)
	})
})
