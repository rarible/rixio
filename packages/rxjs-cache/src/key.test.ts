import { Atom } from "@rixio/rxjs-atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { createFulfilledWrapped } from "@rixio/rxjs-wrapped"
import { KeyCacheImpl } from "./key"
import { CacheState } from "./index"

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
		expect(single.atom.get()).toStrictEqual(createFulfilledWrapped("testing"))
		expect(await single.get()).toBe("testing")
	})
})
