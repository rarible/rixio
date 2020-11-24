import { Atom } from "@rixio/rxjs-atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { KeyCacheImpl } from "./key"
import { CacheState, createFulfilledCache } from "./index"

describe("KeyCacheImpl", () => {
	test("should create single caches", async () => {
		const state$ = Atom.create(IM<string, CacheState<string>>())
		const requests: string[][] = []
		const cache = new KeyCacheImpl(state$, keys => {
			requests.push(keys)
			return Promise.resolve(keys.map(k => [k, k]))
		})

		const single = cache.single("testing")
		expect(state$.get().size).toBe(0)
		single.subscribe()
		cache.single("other").subscribe()
		await waitForExpect(() => {
			expect(single.atom.get()).toStrictEqual(createFulfilledCache("testing"))
		})
		expect(state$.get().size).toBe(2)
		expect(await single.get()).toBe("testing")
		expect(requests.length).toBe(1)

		cache.single("other2").subscribe()
		await waitForExpect(() => {
			expect(cache.single("other2").atom.get()).toStrictEqual(createFulfilledCache("other2"))
		})
		expect(requests.length).toBe(2)
		expect(requests[1]).toStrictEqual(["other2"])
		expect(state$.get().size).toBe(3)
	})
})
