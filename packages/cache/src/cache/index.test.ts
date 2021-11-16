import { Atom } from "@rixio/atom"
import waitForExpect from "wait-for-expect"
import { wrap } from "@rixio/wrapped"
import { CacheState, idleCache } from "../common/domain"
import { CacheImpl } from "."

describe("CacheImpl", () => {
	test("should load data when subscribed and idle", async () => {
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("loaded"))
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe()
		expect(cache.atom.get().status).toBe("pending")
		const data = await cache.get()
		expect(data).toBe("loaded")
		sub1.unsubscribe()
	})

	test("should set idle after clear", () => {
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("test"))
		expect(cache.atom.get().status).toBe("idle")
		const sub1 = cache.subscribe()
		expect(cache.atom.get().status).toBe("pending")
		sub1.unsubscribe()
		cache.clear()
		expect(cache.atom.get().status).toBe("idle")
	})

	test("get should return value and invalidate after clear", async () => {
		let result: string = "loaded"
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve(result))
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
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("other"))
		expect(await cache.get()).toBe("other")
		cache.set("loaded")
		expect(cache.atom.get().status).toBe("fulfilled")
		expect(await cache.get()).toBe("loaded")
	})

	test("reload should work if rejected", async () => {
		let promise: Promise<string> = Promise.reject("reason")
		const atom$ = Atom.create<CacheState<string>>(idleCache)
		const cache = new CacheImpl(atom$, () => promise)
		expect(atom$.get().status).toBe("idle")

		cache.subscribe()
		await waitForExpect(() => {
			expect(atom$.get().status).toBe("rejected")
		})

		if (cache.value.status === "rejected") {
			promise = Promise.resolve("resolved")
			cache.value.reload()
			expect(atom$.get().status).toBe("pending")
			await waitForExpect(() => {
				expect(atom$.get().status).toBe("fulfilled")
			})
		} else {
			fail()
		}
	})

	test("wrap utility should work", () => {
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.reject("reason"))
		expect(wrap(cache)).toStrictEqual(cache)
	})
})
