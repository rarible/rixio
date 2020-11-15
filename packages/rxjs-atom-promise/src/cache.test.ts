import { Atom } from "@rixio/rxjs-atom"
import waitForExpect from "wait-for-expect"
import { CacheImpl } from "./cache"
import { createCacheStateIdle, WrappedRx, cacheStatusPending } from "./cache-state"

describe("CacheImpl", () => {
	test("should load data when subscribed and idle", async () => {
		let result: string = "loaded"
		const cache = new CacheImpl(Atom.create(createCacheStateIdle<string>()), () => Promise.resolve(result))
		expect(cache.atom.get().status).toBe("idle")

		const s = cache.subscribe()
		await waitForExpect(() => {
			expect(cache.atom.get().status).toBe("fulfilled")
			expect(cache.atom.get().value).toBe("loaded")
		})

		result = "reloaded"
		cache.clear()
		await waitForExpect(() => {
			expect(cache.atom.get().status).toBe("fulfilled")
			expect(cache.atom.get().value).toBe("reloaded")
		})

		s.unsubscribe()
		cache.clear()
		const shouldReject = waitForExpect(() => {
			expect(cache.atom.get().status).toBe("fulfilled")
		}, 300)
		await expect(shouldReject).rejects.toBeTruthy()
		expect(cache.atom.get().status).toBe("idle")
	})

	test("get should work", async () => {
		let result: string = "loaded"
		const cache = new CacheImpl(Atom.create(createCacheStateIdle<string>()), () => Promise.resolve(result))
		expect(cache.atom.get().status).toBe("idle")

		const value = await cache.get()
		expect(value).toBe("loaded")

		result = "other"
		const value2 = await cache.get()
		expect(value2).toBe("loaded")

		cache.clear()
		const shouldReject = waitForExpect(() => {
			expect(cache.atom.get().status).toBe("fulfilled")
		}, 300)
		await expect(shouldReject).rejects.toBeTruthy()
		expect(cache.atom.get().status).toBe("idle")
	})

	test("set should work", async () => {
		const cache = new CacheImpl(Atom.create(createCacheStateIdle<string>()), () => Promise.resolve("other"))
		expect(cache.atom.get().status).toBe("idle")
		cache.set("loaded")
		expect(cache.atom.get().status).toBe("fulfilled")

		const value = await cache.get()
		expect(value).toBe("loaded")
	})

	test("cache should be provided in rejected state", async () => {
		let promise: Promise<string> = Promise.reject("reason")
		const cache = new CacheImpl(Atom.create(createCacheStateIdle<string>()), () => promise)
		expect(cache.atom.get().status).toBe("idle")

		let value: WrappedRx<string> = cacheStatusPending as WrappedRx<string>
		let error: any = null
		cache.subscribe(
			v => value = v,
			e => error = e,
		)
		await waitForExpect(() => {
			expect(value.status).toBe("rejected")
		})
		expect(error).toBeNull()
		if (value && value.status === "rejected") {
			expect(value.cache).toStrictEqual(cache)
		} else {
			fail()
		}
	})
})
