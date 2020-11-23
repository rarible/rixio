import { Atom } from "@rixio/rxjs-atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { KeyCacheImpl } from "./key"
import { CacheState, createFulfilledCache } from "./index"

describe("KeyCacheImpl", () => {
	test("should create single caches", async () => {
		const state$ = Atom.create(IM<string, CacheState<string>>())
		const cache = new KeyCacheImpl(state$, {
			load(key: string): Promise<string> {
				return Promise.resolve(key)
			},
		})

		const single = cache.single("testing")
		expect(state$.get().size).toBe(0)
		single.subscribe()
		await waitForExpect(() => {
			expect(state$.get().size).toBe(1)
		})
		expect(single.atom.get()).toStrictEqual(createFulfilledCache("testing"))
		expect(await single.get()).toBe("testing")
	})
})
