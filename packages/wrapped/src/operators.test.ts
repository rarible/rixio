import { identity, Subject } from "rxjs"
import waitForExpect from "wait-for-expect"
import { catchError, combineLatest, flatMap, map, unwrap } from "./operators"
import { createFulfilledWrapped, createRejectedWrapped, Fulfilled, Rejected, Wrapped } from "./domain"
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

	test("map should catch error in mapper function", () => {
		const s = new Subject<number>()
		const ERROR = "error"
		const mapped = s.pipe(map(() => {
			throw new Error(ERROR)
		}))
		const emitted: Wrapped<string>[] = []
		mapped.subscribe(v => emitted.push(v))
		expect(wrap(mapped)).toStrictEqual(mapped)
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(1)
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		expect((emitted[1] as any).error.message).toBe(ERROR)
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

	test("catchError should map rejected status of Wrapped", async () => {
		const catchMapper = (x: any) => x + 2
		const s = new Subject<Wrapped<number>>()
		const mapped = s.pipe(catchError(catchMapper))
		const values: Wrapped<number>[] = []
		mapped.subscribe(x => values.push(x))
		expect(wrap(mapped)).toStrictEqual(mapped)
		expect(values.length).toBe(1)
		expect(values[0].status).toBe("pending")

		s.next(createFulfilledWrapped(1))
		expect(values.length).toBe(2)
		expect(values[1].status).toBe("fulfilled")
		expect((values[1] as Fulfilled<number>).value).toBe(1)
		s.next(createRejectedWrapped(1))
		expect(values.length).toBe(3)
		expect(values[2].status).toBe("fulfilled")
		expect((values[2] as Fulfilled<number>).value).toBe(catchMapper(1))
	})

	test("unwrap should accept WrappedObservable<T> and return Observable<T>", async () => {
		const s = new Subject<number>()
		const mapped = s.pipe(map(identity), unwrap())
		const values: number[] = []
		const errors: Array<any> = []
		mapped.subscribe(x => values.push(x), x => errors.push(x))
		expect(values.length).toBe(0)

		s.next(1)
		expect(values.length).toBe(1)
		expect(values[0]).toBe(1)
	})

	test("unwrap should throw error if receive rejected status", async () => {
		const s = new Subject<Wrapped<number>>()
		const original = s.pipe(map(identity))
		const unwrapped = original.pipe(unwrap())
		const originalValues: Wrapped<number>[] = []
		const values: number[] = []
		const unwrappedErrors: any[] = []
		unwrapped.subscribe(x => values.push(x), x => unwrappedErrors.push(x))
		original.subscribe(x => originalValues.push(x))
		expect(values.length).toBe(0)
		expect(originalValues.length).toBe(1)
		expect(originalValues[0].status).toBe("pending")

		const ERROR = "error"
		s.next(createRejectedWrapped(ERROR))
		expect(unwrappedErrors.length).toBe(1)
		expect(unwrappedErrors[0]).toBe(ERROR)
	})
})

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
