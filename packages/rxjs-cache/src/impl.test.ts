import { Atom } from "@rixio/rxjs-atom"
import waitForExpect from "wait-for-expect"
import { pendingWrapped, wrap, Wrapped } from "@rixio/rxjs-wrapped"
import { CacheImpl } from "./impl"
import { CacheState, idleCache } from "./index"

describe("CacheImpl", () => {
	test("should load data when subscribed and idle", async () => {
		let result: string = "loaded"
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve(result))
		expect(cache.atom.get().status).toBe("idle")

		const s = cache.subscribe()
		await waitForExpect(() => {
			let value = cache.atom.get()
			if (value.status === "fulfilled") {
				expect(value.value).toBe("loaded")
			} else {
				fail()
			}
		})

		result = "reloaded"
		cache.clear()
		await waitForExpect(() => {
			const value = cache.atom.get()
			if (value.status === "fulfilled") {
				expect(value.value).toBe("reloaded")
			} else {
				fail()
			}
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
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve(result))
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
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("other"))
		expect(cache.atom.get().status).toBe("idle")
		cache.set("loaded")
		expect(cache.atom.get().status).toBe("fulfilled")

		const value = await cache.get()
		expect(value).toBe("loaded")
	})

	test("reload should work if rejected", async () => {
		let promise: Promise<string> = Promise.reject("reason")
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => promise)
		expect(cache.atom.get().status).toBe("idle")

		let value: Wrapped<string> = pendingWrapped
		let error: any = null
		cache.subscribe(
			v => (value = v),
			e => (error = e)
		)
		await waitForExpect(() => {
			expect(value.status).toBe("rejected")
		})
		expect(error).toBeNull()
		if (value.status !== "rejected") {
			fail()
		}

		promise = Promise.resolve("resolved")
		value.reload()
		await waitForExpect(() => {
			expect(value.status).toBe("fulfilled")
		})
	})

	test("cache is already wrapped", () => {
		const cache = new CacheImpl(Atom.create(idleCache as CacheState<string>), () => Promise.reject("reason"))
		expect(wrap(cache)).toStrictEqual(cache)
	})
})
