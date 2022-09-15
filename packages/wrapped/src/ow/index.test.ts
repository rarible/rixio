import { defer, noop, Subject, Subscription } from "rxjs"
import { shareReplay } from "rxjs/operators"
import { WrappedFulfilled, WrappedRejected, Wrapped } from "../domain"
import { OW } from "./index"

describe("OW", () => {
	test("should wrap plain observable", () => {
		const s = new Subject<number>()
		const wrapped = new OW(s)
		const emitted: Array<Wrapped<number>> = []
		const sub = wrapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(1)
		expect(emitted.length).toBe(2)
		const em2 = emitted[1]
		expect(em2.status).toBe("fulfilled")
		expect((em2 as any).value).toBe(1)

		s.error("reason")
		expect(emitted.length).toBe(3)
		const em3 = emitted[2]
		expect(em3.status).toBe("rejected")
		expect((em3 as any).error).toBe("reason")

		sub.unsubscribe()
	})

	test("should skip double pending emit", async () => {
		const loader = jest.fn().mockImplementation(() => delay(100).then(() => true))
		const wrapped = new OW(defer(() => loader()).pipe(shareReplay(1)))
		expect(loader.mock.calls.length).toEqual(0)

		const emitted: Array<Wrapped<number>> = []
		const sub = new Subscription()
		sub.add(wrapped.subscribe(noop))
		sub.add(wrapped.subscribe(x => emitted.push(x as any)))
		expect(loader.mock.calls.length).toEqual(1)
		expect(emitted.length).toEqual(1)
		expect(emitted[0].status).toEqual("pending")
		await delay(120)
		expect(emitted.length).toEqual(2)
		expect(emitted[1].status).toEqual("fulfilled")

		sub.unsubscribe()
	})

	test("should reject with error", async () => {
		const err = new Error("My error")
		const loader = jest.fn().mockImplementation(() => delay(100).then(() => Promise.reject(err)))
		const wrapped = new OW(defer(() => loader()).pipe(shareReplay(1)))
		expect(loader.mock.calls.length).toEqual(0)

		const emitted: Array<Wrapped<number>> = []
		const sub = new Subscription()
		sub.add(wrapped.subscribe(noop))
		sub.add(wrapped.subscribe(x => emitted.push(x as any)))
		expect(loader.mock.calls.length).toEqual(1)
		expect(emitted.length).toEqual(1)
		expect(emitted[0].status).toEqual("pending")
		await delay(120)
		expect(emitted.length).toEqual(2)
		expect(emitted[1].status).toEqual("rejected")
		expect((emitted[1] as WrappedRejected).error).toEqual(err)

		sub.unsubscribe()
	})

	test("should do nothing if it's already wrapped", () => {
		const s = new Subject<Wrapped<number>>()
		const wrapped = new OW(s)
		const emitted: Array<Wrapped<number>> = []
		const sub = wrapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(WrappedFulfilled.create(1))
		expect(emitted.length).toBe(2)
		const em2 = emitted[1]
		expect(em2.status).toBe("fulfilled")
		expect((em2 as any).value).toBe(1)

		s.next(WrappedRejected.create("reason"))
		expect(emitted.length).toBe(3)
		const em3 = emitted[2]
		expect(em3.status).toBe("rejected")
		expect((em3 as any).error).toBe("reason")

		s.next(WrappedRejected.create("reason2"))
		expect(emitted.length).toBe(4)
		const em4 = emitted[3]
		expect(em4.status).toBe("rejected")
		expect((em4 as any).error).toBe("reason2")

		sub.unsubscribe()
	})
})

function delay(ms: number) {
	return new Promise(r => setTimeout(r, ms))
}
