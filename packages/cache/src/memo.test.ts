import { Atom } from "@rixio/atom"
import { noop } from "rxjs"
import { first, map } from "rxjs/operators"
import waitForExpect from "wait-for-expect"
import { CacheState, idleCache } from "./domain"
import { MemoImpl } from "./memo"

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

	test("should start fetching after subscribe on rejected Memo", async () => {
		const atom$ = Atom.create<CacheState<string>>(idleCache)
		let counter = 0
		const cache = new MemoImpl(atom$, async () => {
			counter = counter + 1
			if (counter < 2) {
				throw "rejected"
			} else {
				return "resolved"
			}
		})
		expect(counter).toEqual(0)
		const emitted: string[] = []
		const emittedStatuses: CacheState<any>["status"][] = []
		atom$.subscribe(x => emittedStatuses.push(x.status))

		const sub1 = cache.subscribe(value => emitted.push(value), noop)
		expect(counter).toEqual(1)
		await waitForExpect(() => {
			expect(atom$.get().status).toBe("rejected")
		})
		expect(emitted).toStrictEqual([])
		sub1.unsubscribe()
		expect(emittedStatuses).toStrictEqual(["idle", "pending", "rejected"])

		const sub2 = cache.subscribe(value => emitted.push(value), noop)
		expect(counter).toEqual(2)
		await waitForExpect(() => {
			expect(atom$.get().status).toBe("fulfilled")
		})
		expect(counter).toEqual(2)
		expect(emittedStatuses).toEqual(["idle", "pending", "rejected", "pending", "fulfilled"])
		expect(emitted).toStrictEqual(["resolved"])
		sub2.unsubscribe()
	})
})
