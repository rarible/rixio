import { Atom } from "@rixio/atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { waitFor } from "@testing-library/react"
import { KeyMemoImpl } from "./key-memo"
import { KeyEvent } from "./domain"
import { CacheState, createFulfilledCache, toListDataLoader } from "./index"

describe("KeyMemoImpl", () => {
	test("should create single caches", async () => {
		const state$ = Atom.create(IM<string, CacheState<string>>())
		const requests: string[][] = []
		const cache = new KeyMemoImpl(state$, keys => {
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
		const cache = new KeyMemoImpl<string, number | undefined>(
			Atom.create(IM()),
			toListDataLoader(() => Promise.resolve(undefined))
		)
		const emitted: Array<number | undefined> = []
		cache.single("test").subscribe(value => emitted.push(value))
		await waitFor(() => {
			expect(emitted.length).toBe(1)
			expect(emitted[0]).toEqual(undefined)
		})
	})

	test("should be reloaded if cleared", async () => {
		let value: number = 10
		const cache = new KeyMemoImpl<string, number>(
			Atom.create(IM()),
			toListDataLoader(() => Promise.resolve(value))
		)

		const emitted: number[] = []
		cache.single("key1").subscribe(value => emitted.push(value))
		await waitFor(() => {
			expect(emitted.length).toBe(1)
			expect(emitted[0]).toEqual(10)
		})
		value = 20
		cache.single("key1").clear()
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[1]).toEqual(20)
		})
	})

	test("should put new entry in events Subject", async () => {
		function loadData(key: string) {
			return Promise.resolve(key)
		}
		const cache = new KeyMemoImpl<string, string>(
			Atom.create(IM()),
			toListDataLoader(key => loadData(key))
		)

		const emitted: KeyEvent<string>[] = []
		cache.events.subscribe(value => emitted.push(value))
		cache.get("test").then()

		await waitFor(() => {
			expect(emitted.length).toBe(1)
			expect(emitted[0]).toStrictEqual({
				type: "add",
				key: "test",
			})
		})

		cache.get("test2").then()
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[1]).toStrictEqual({
				type: "add",
				key: "test2",
			})
		})

		cache.set("test3", "test3")
		await waitFor(() => {
			expect(emitted.length).toBe(3)
			expect(emitted[2]).toStrictEqual({
				type: "add",
				key: "test3",
			})
		})
	})
})
