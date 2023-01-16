import { Atom } from "@rixio/atom"
import { noop } from "rxjs"
import { first, map, take } from "rxjs/operators"
import { CacheState, CacheIdle } from "../domain"
import { MemoImpl } from "./index"

globalThis.Promise = jest.requireActual("promise")

describe("MemoImpl", () => {
	test("should load data when subscribed and idle", async () => {
		const { getTimes, cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe()
		expect(cache.atom.get().status).toBe("pending")
		const data = await cache.get()
		expect(data).toBe("loaded")
		expect(getTimes()).toBe(1)
		sub1.unsubscribe()
		const data2 = await cache.get()
		expect(data2).toBe("loaded")
		expect(getTimes()).toBe(1)
	})

	test("should force get", async () => {
		const { getTimes, cache } = createTestSet()
		await cache.get()
		await cache.get()
		expect(getTimes()).toBe(1)
		await cache.get(true)
		expect(getTimes()).toBe(2)
	})

	test("should set idle after clear and not start loading", () => {
		const { cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe(noop)
		expect(cache.atom.get().status).toBe("pending")
		sub1.unsubscribe()
		cache.clear()
		expect(cache.atom.get().status).toBe("idle")
	})

	test("should start loading right after clear if someone subscribed", async () => {
		const { cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		cache.subscribe(noop)
		expect(cache.atom.get().status).toBe("pending")
		await delay(120)
		expect(cache.atom.get().status).toBe("fulfilled")
		expect(await cache.pipe(take(1)).toPromise()).toBe("loaded")
		cache.clear()
		expect(cache.atom.get().status).toBe("pending")
		await delay(120)
		expect(cache.atom.get().status).toBe("fulfilled")
		expect(await cache.pipe(take(1)).toPromise()).toBe("loaded")
	})

	test("get should return value and invalidate after clear", async () => {
		let result: string = "loaded"
		const cache = new MemoImpl<string>(
			Atom.create(CacheIdle.create()),
			() => new Promise(resolve => setTimeout(() => resolve(result), 100))
		)
		expect(cache.atom.get().status).toBe("idle")
		const value = await cache.get()
		expect(value).toBe("loaded")
		result = "other"
		expect(await cache.get()).toBe("loaded")
		cache.clear()
		expect(cache.atom.get().status).toBe("idle")
		const value3 = await cache.get()
		expect(value3).toBe("other")
	})

	test("set should work", async () => {
		const { cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		const value1 = await cache.get()
		expect(value1).toBe("loaded")
		cache.set("other")
		expect(cache.atom.get().status).toBe("fulfilled")
		const value = await cache.get()
		expect(value).toBe("other")
	})

	test("modify should work", async () => {
		const { cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		const value1 = await cache.get()
		expect(value1).toBe("loaded")
		cache.modifyIfFulfilled(x => x + "1")
		expect(cache.atom.get().status).toBe("fulfilled")
		const value = await cache.get()
		expect(value).toBe("loaded1")
	})

	test("rxjs operators should work", async () => {
		const { cache } = createTestSet()
		expect(cache.atom.get().status).toBe("idle")
		const value1 = await cache
			.pipe(
				map(x => x + "1"),
				first()
			)
			.toPromise()
		expect(value1).toBe("loaded1")
	})

	test("should start fetching after subscribe on rejected Memo", async () => {
		const atom$ = Atom.create<CacheState<string>>(CacheIdle.create())
		let counter = 0
		const cache = new MemoImpl(atom$, () => {
			counter = counter + 1
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					return counter <= 1 ? reject("rejected") : resolve("resolved")
				}, 100)
			})
		})
		expect(counter).toEqual(0)
		const emitted: string[] = []
		const emittedStatuses: CacheState<any>["status"][] = []
		atom$.subscribe(x => {
			emittedStatuses.push(x.status)
		})

		const sub1 = cache.subscribe(x => emitted.push(x), noop)
		expect(counter).toEqual(1)

		await delay(120)
		expect(atom$.get().status).toBe("rejected")
		expect(emitted).toStrictEqual([])
		sub1.unsubscribe()
		expect(emittedStatuses).toStrictEqual(["idle", "pending", "rejected"])

		const sub2 = cache.subscribe(x => emitted.push(x))
		expect(counter).toEqual(2)
		await delay(120)
		expect(atom$.get().status).toBe("fulfilled")
		expect(counter).toEqual(2)
		expect(emittedStatuses).toEqual(["idle", "pending", "rejected", "idle", "pending", "fulfilled"])
		expect(emitted).toStrictEqual(["resolved"])
		sub2.unsubscribe()
	})

	test("notifies observer if data is already fetched", async () => {
		const { getTimes, cache } = createTestSet()
		cache.subscribe(noop)
		const emitted1: string[] = []
		cache.subscribe(x => emitted1.push(x))
		await delay(120)
		expect(emitted1).toStrictEqual(["loaded"])
		expect(getTimes()).toBe(1)
		cache.clear()
		await delay(120)
		expect(emitted1).toStrictEqual(["loaded", "loaded"])
		expect(getTimes()).toBe(2)
	})
})

function createTestSet() {
	let times = 0
	return {
		getTimes: () => times,
		cache: new MemoImpl<string>(Atom.create(CacheIdle.create()), () => {
			times = times + 1
			return Promise.resolve("loaded")
		}),
	}
}

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms))
}
