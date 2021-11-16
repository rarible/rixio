import { Atom } from "@rixio/atom"
import waitForExpect from "wait-for-expect"
import { MemoImpl } from "./memo"
import { CacheState, idleCache } from "./index"

describe("MemoImpl", () => {
	test("should load data when subscribed and idle", async () => {
		let result: string = "loaded"
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve(result))
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
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve(result))
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
		const cache = new MemoImpl(Atom.create(idleCache as CacheState<string>), () => Promise.resolve("other"))
		expect(cache.atom.get().status).toBe("idle")
		cache.set("loaded")
		expect(cache.atom.get().status).toBe("fulfilled")

		const value = await cache.get()
		expect(value).toBe("loaded")
	})
})
