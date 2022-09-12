import { Atom } from "@rixio/atom"
import { Map as IM } from "immutable"
import waitForExpect from "wait-for-expect"
import { createFulfilledWrapped, pendingWrapped, Rejected, Wrapped } from "@rixio/wrapped"
import { waitFor } from "@testing-library/react"
import { KeyCacheImpl, toListLoader, toListDataLoader } from "./key"
import { createAddKeyEvent, createErrorKeyEvent, KeyEvent } from "./domain"
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

	test("should mark items as errors if load list fails", async () => {
		const cache = new KeyCacheImpl<string, number | undefined>(Atom.create(IM()), () => Promise.reject("rejected"))
		const emitted: Wrapped<number | undefined>[] = []
		const emittedEvents: KeyEvent<string>[] = []
		cache.events.subscribe(x => emittedEvents.push(x))
		cache.single("test").subscribe(x => emitted.push(x))
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[0]).toStrictEqual(pendingWrapped)
			expect(emitted[1].status).toBe("rejected")
			const error = new Error('Entity with key "test" not found')
			expect((emitted[1] as Rejected).error).toStrictEqual(error)
			expect(emittedEvents.length).toEqual(3)
			expect(emittedEvents[0]).toStrictEqual(createAddKeyEvent("test"))
			expect(emittedEvents[1]).toStrictEqual(createErrorKeyEvent("test", "rejected"))
			expect(emittedEvents[2]).toStrictEqual(createErrorKeyEvent("test", error))
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

	test("should put new entry in events Subject", async () => {
		function loadData(key: string) {
			return Promise.resolve(key)
		}
		const cache = new KeyCacheImpl<string, string>(
			Atom.create(IM()),
			toListDataLoader(key => loadData(key))
		)

		const emitted: KeyEvent<string>[] = []
		cache.events.subscribe(value => emitted.push(value))
		cache.get("test").then()

		await waitFor(() => {
			expect(emitted.length).toBe(1)
			expect(emitted[0]).toStrictEqual(createAddKeyEvent("test"))
		})

		cache.get("test2").then()
		await waitFor(() => {
			expect(emitted.length).toBe(2)
			expect(emitted[1]).toStrictEqual(createAddKeyEvent("test2"))
		})

		cache.set("test3", "test3")
		await waitFor(() => {
			expect(emitted.length).toBe(3)
			expect(emitted[2]).toStrictEqual(createAddKeyEvent("test3"))
		})
	})
})

describe("toListLoader", () => {
	it("should resolve all values", async () => {
		const loader = toListLoader<string, string, undefined>(x => Promise.resolve(x + "1"), undefined)
		const result = await loader(["hello", "world"])
		expect(result).toStrictEqual([
			["hello", "hello1"],
			["world", "world1"],
		])
	})

	it("should return default value if one element fails", async () => {
		const logger = jest.fn()
		const err = new Error("My error")
		const loader = toListLoader<string, string, undefined>(
			x => {
				if (x === "hello") return Promise.reject(err)
				return Promise.resolve(x + "1")
			},
			undefined,
			logger
		)
		const result = await loader(["hello", "world"])
		expect(result).toStrictEqual([
			["hello", undefined],
			["world", "world1"],
		])
		expect(logger.mock.calls[0]).toEqual(["hello", err])
	})
})
