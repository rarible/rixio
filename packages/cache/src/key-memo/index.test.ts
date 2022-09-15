import { Atom } from "@rixio/atom"
import { Map as IM } from "immutable"
import { KeyEvent, CacheState, createAddKeyEvent, createErrorKeyEvent, CacheFulfilled, KeyEventError } from "../domain"
import { UnknownError } from "../utils/errors"
import { KeyMemoImpl } from "../key-memo"
import { toListLoader } from "../utils/to-list-loader"

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
		await delay(200)
		expect(single.atom.get()).toStrictEqual(CacheFulfilled.create("testing"))
		expect(state$.get().size).toBe(2)
		expect(await single.get()).toBe("testing")
		expect(requests.length).toBe(1)

		cache.single("other2").subscribe()
		await delay(120)
		expect(cache.single("other2").atom.get()).toStrictEqual(CacheFulfilled.create("other2"))

		expect(requests.length).toBe(2)
		expect(requests[1]).toStrictEqual(["other2"])
		expect(state$.get().size).toBe(3)
	})

	test("should work with undefined values", async () => {
		const cache = new KeyMemoImpl<string, number | undefined>(
			Atom.create(IM()),
			toListLoader(() => Promise.resolve(undefined), undefined)
		)
		const emitted: Array<number | undefined> = []
		cache.single("test").subscribe(x => emitted.push(x))
		await delay(120)
		expect(emitted.length).toBe(1)
		expect(emitted[0]).toEqual(undefined)
	})

	test("should be reloaded if cleared", async () => {
		let value: number = 10
		const cache = new KeyMemoImpl<string, number | undefined>(
			Atom.create(IM()),
			toListLoader(() => Promise.resolve(value), undefined)
		)

		const emitted: Array<number | undefined> = []
		cache.single("key1").subscribe(x => emitted.push(x))
		await delay(120)
		expect(emitted.length).toBe(1)
		expect(emitted[0]).toEqual(10)
		value = 20
		cache.single("key1").clear()
		await delay(120)
		expect(emitted.length).toBe(2)
		expect(emitted[1]).toEqual(20)
	})

	test("should put new entry in events Subject", async () => {
		const cache = new KeyMemoImpl<string, string | undefined>(
			Atom.create(IM()),
			toListLoader(x => Promise.resolve(x), undefined)
		)

		const emitted: KeyEvent<string>[] = []
		cache.events.subscribe(value => emitted.push(value))
		cache.get("test").then()
		expect(emitted.length).toBe(1)
		expect(emitted[0]).toStrictEqual(createAddKeyEvent("test"))

		cache.get("test2").then()
		expect(emitted.length).toBe(2)
		expect(emitted[1]).toStrictEqual(createAddKeyEvent("test2"))

		cache.set("test3", "test3")
		expect(emitted.length).toBe(3)
		expect(emitted[2]).toStrictEqual(createAddKeyEvent("test3"))
	})

	test("should mark items as errors if load list fails", async () => {
		const cache = new KeyMemoImpl<string, number | undefined>(Atom.create(IM()), () => Promise.reject("rejected"))
		const emitted: (number | undefined)[] = []
		const emittedEvents: KeyEvent<string>[] = []
		cache.events.subscribe(x => emittedEvents.push(x))
		const errorsEmitted: unknown[] = []
		cache.single("test").subscribe({
			next: x => emitted.push(x),
			error: e => errorsEmitted.push(e),
		})
		await delay(120)
		expect(emitted.length).toBe(0)
		expect(errorsEmitted.length).toBe(1)
		expect(errorsEmitted[0]).toBeInstanceOf(UnknownError)
		expect(emittedEvents.length).toEqual(3)
		expect(emittedEvents[0]).toStrictEqual(createAddKeyEvent("test"))
		expect(emittedEvents[1]).toStrictEqual(createErrorKeyEvent("test", "rejected"))
		expect((emittedEvents[2] as KeyEventError<string>).error).toBeInstanceOf(UnknownError)
	})
})

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms))
}
