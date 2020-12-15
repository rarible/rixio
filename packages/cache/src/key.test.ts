import { Atom } from "@rixio/atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { createFulfilledWrapped, pendingWrapped, Wrapped } from "@rixio/wrapped"
import { waitFor } from "@testing-library/react"
import { KeyCacheImpl, toListDataLoader } from "./key"
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

	test("should work with undefined values", async () => {
		const cache = new KeyCacheImpl<string, number | undefined>(
			Atom.create(IM()),
			toListDataLoader(() => Promise.resolve(undefined))
		)
		const emitted: Wrapped<number | undefined>[] = []
		cache.single("test").subscribe(value => emitted.push(value))
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[0]).toStrictEqual(pendingWrapped)
			expect(emitted[1]).toStrictEqual(createFulfilledWrapped(undefined))
		})
	})

	test("should be reloaded if cleared", async () => {
		let value: number = 10
		const cache = new KeyCacheImpl<string, number>(
			Atom.create(IM()),
			toListDataLoader(() => Promise.resolve(value))
		)

		const emitted: Wrapped<number>[] = []
		cache.single("key1").subscribe(value => emitted.push(value))
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[0]).toStrictEqual(pendingWrapped)
			expect(emitted[1]).toStrictEqual(createFulfilledWrapped(10))
		})
		value = 20
		cache.single("key1").clear()
		await waitFor(() => {
			expect(emitted.length).toBe(4)
			expect(emitted[2]).toStrictEqual(pendingWrapped)
			expect(emitted[3]).toStrictEqual(createFulfilledWrapped(20))
		})
	})
})
