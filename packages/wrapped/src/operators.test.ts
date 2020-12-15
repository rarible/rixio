import { Subject } from "rxjs"
import waitForExpect from "wait-for-expect"
import { combineLatest, flatMap, map } from "./operators"
import { createRejectedWrapped, Rejected, Wrapped } from "./domain"
import { wrap } from "./utils";

describe("operators", () => {
	test("map should work with plain observables", () => {
		const s = new Subject<number>()
		const mapped = s.pipe(map(x => `${x}`))
		const emitted: Wrapped<string>[] = []
		mapped.subscribe(v => emitted.push(v))
		expect(wrap(mapped)).toStrictEqual(mapped)
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(1)
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("fulfilled")
		expect((emitted[1] as any).value).toBe("1")
	})

	test("combineLatest should lift plain observables", () => {
		const n = new Subject<number>()
		const s = new Subject<string>()
		const combined = combineLatest([n, s])

		const emitted: Wrapped<[number, string]>[] = []
		combined.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		n.next(1)
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next("s1")
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("fulfilled")
		expect((emitted[1] as any).value).toStrictEqual([1, "s1"])

		s.error("reason-string")
		expect(emitted.length).toBe(3)
		expect(emitted[2].status).toBe("rejected")
		expect((emitted[2] as any).error).toBe("reason-string")
	})

	test("flatMap should work with Promises", async () => {
		const s = new Subject<string>()
		const flatMapped = s.pipe(flatMap(x => delay(100).then(() => parseInt(x))))

		const emitted: Wrapped<number>[] = []
		flatMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next("1")
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		await waitForExpect(() => {
			expect(emitted.length).toBe(2)
		}, 150)
		expect(emitted[1].status).toBe("fulfilled")
		expect((emitted[1] as any).value).toBe(1)
	})

	test("flatMap should save reload function", async () => {
		const s = new Subject<Wrapped<string>>()
		const flatMapped = s.pipe(flatMap(x => delay(100).then(() => parseInt(x))))

		const emitted: Wrapped<number>[] = []
		flatMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		let invoked = false
		s.next(createRejectedWrapped("reason1", () => (invoked = true)))
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		const rej = emitted[1] as Rejected
		expect(rej.error).toBe("reason1")
		expect(invoked).toBe(false)
		rej.reload()
		expect(invoked).toBe(true)
	})
})

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
