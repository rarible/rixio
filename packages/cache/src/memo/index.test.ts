import { Atom } from "@rixio/atom"
import { first, map } from "rxjs/operators"
import { CacheState, idleCache } from "../cache/domain"
import { MemoImpl } from "."

describe("MemoImpl", () => {
	test("should load data when subscribed and idle", async () => {
		let times = 0
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => {
			times = times + 1
			return Promise.resolve("loaded")
		})
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe()
		expect(cache.atom.get().status).toBe("pending")
		const data = await cache.get()
		expect(data).toBe("loaded")
		expect(times).toBe(1)
		sub1.unsubscribe()
		const data2 = await cache.get()
		expect(data2).toBe("loaded")
		expect(times).toBe(1)
	})

	test("should set idle after clear", () => {
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("test"))
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe()
		expect(cache.atom.get().status).toBe("pending")
		sub1.unsubscribe()
		cache.clear()
		expect(cache.atom.get().status).toBe("idle")
	})

	test("get should return value and invalidate after clear", async () => {
		let result: string = "loaded"
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => {
			return new Promise(resolve => {
				setTimeout(() => resolve(result), 100)
			})
		})
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
		const atom$ = Atom.create<CacheState<string>>(idleCache)
		const cache = new MemoImpl(atom$, () => Promise.resolve("other"))
		expect(atom$.get().status).toBe("idle")
		const value1 = await cache.get()
		expect(value1).toBe("other")
		cache.set("loaded")
		expect(atom$.get().status).toBe("fulfilled")

		const value = await cache.get()
		expect(value).toBe("loaded")
	})

	test("modify should work", async () => {
		const atom$ = Atom.create<CacheState<string>>(idleCache)
		const cache = new MemoImpl(atom$, () => Promise.resolve("other"))
		expect(atom$.get().status).toBe("idle")
		const value1 = await cache.get()
		expect(value1).toBe("other")
		cache.modifyIfFulfilled(x => x + "1")
		expect(atom$.get().status).toBe("fulfilled")

		const value = await cache.get()
		expect(value).toBe("other1")
	})

	test("rxjs operators should work", async () => {
		const atom$ = Atom.create<CacheState<string>>(idleCache)
		const cache = new MemoImpl(atom$, () => Promise.resolve("other"))
		expect(atom$.get().status).toBe("idle")
		const value1 = await cache
			.pipe(
				map(x => x + "1"),
				first()
			)
			.toPromise()
		expect(value1).toBe("other1")
	})
})
