import { identity, Subject } from "rxjs"
import { catchError, combineLatest, filter, flatMap, map, switchMap, unwrap } from "./operators"
import { createFulfilledWrapped, createRejectedWrapped, Fulfilled, Rejected, Wrapped } from "./domain"
import { wrap } from "./utils"

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
		expectValue(emitted[1], "1")
	})

	test("map should catch error in mapper function", () => {
		const s = new Subject<number>()
		const ERROR = "error"
		const mapped = s.pipe(
			map(() => {
				throw new Error(ERROR)
			})
		)
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

	test("combineLatest should work with empty arrays", async () => {
		const combined = combineLatest([])

		const emitted: Wrapped<[]>[] = []
		combined.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("fulfilled")
		expect((emitted[0] as any).value).toStrictEqual([])
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

		await delay(120)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 1)
	})

	test("flatMap should save reload function", async () => {
		const s = new Subject<Wrapped<string>>()
		const flatMapped = s.pipe(flatMap(x => delay(100).then(() => parseInt(x))))

		const emitted: Wrapped<number>[] = []
		flatMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		const reload = jest.fn()
		s.next(createRejectedWrapped("reason1", reload))
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		const rej = emitted[1] as Rejected
		expect(rej.error).toBe("reason1")
		expect(reload.mock.calls.length).toEqual(0)
		rej.reload()
		expect(reload.mock.calls.length).toEqual(1)
	})

	test("flatMap shouldn't cancel previous emits", async () => {
		const s = new Subject<Wrapped<string>>()

		let index = 0
		const flatMapped = s.pipe(
			flatMap(async x => {
				if (index === 0) {
					index = index + 1
					await delay(100)
				}
				return parseInt(x)
			})
		)

		const emitted: Wrapped<number>[] = []
		flatMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(createFulfilledWrapped("10"))
		s.next(createFulfilledWrapped("15"))

		await delay(16)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 15)

		await delay(100)
		expect(emitted.length).toBe(3)
		expectValue(emitted[2], 10)
		expect(emitted[2].status).toBe("fulfilled")
		expect((emitted[2] as any).value).toBe(10)
	})

	test("switchMap should save reload function", () => {
		const s = new Subject<Wrapped<string>>()
		const switchMapped = s.pipe(switchMap(x => delay(100).then(() => parseInt(x))))

		const emitted: Wrapped<number>[] = []
		switchMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		const reload = jest.fn()
		s.next(createRejectedWrapped("reason1", reload))
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		const rej = emitted[1] as Rejected
		expect(rej.error).toBe("reason1")
		expect(reload.mock.calls.length).toEqual(0)
		rej.reload()
		expect(reload.mock.calls.length).toEqual(1)
	})

	test("switchMap should cancel previous emits", async () => {
		const s = new Subject<Wrapped<string>>()

		let index = 0
		const switchMapped = s.pipe(
			switchMap(async x => {
				if (index === 0) {
					index = index + 1
					await delay(100)
				}
				return parseInt(x)
			})
		)

		const emitted: Wrapped<number>[] = []
		switchMapped.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(createFulfilledWrapped("10"))
		s.next(createFulfilledWrapped("15"))

		await delay(120)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 15)
	})

	test("filter should filter out even numbers", () => {
		const s = new Subject<Wrapped<number>>()
		const filtered = s.pipe(filter(x => x % 2 === 0))

		const emitted: Wrapped<number>[] = []
		filtered.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(createFulfilledWrapped(5))
		expect(emitted.length).toBe(1)

		s.next(createFulfilledWrapped(10))
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 10)
	})

	test("catchError should map rejected status of Wrapped", () => {
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
		expectValue(values[1], 1)
		s.next(createRejectedWrapped(1))
		expect(values.length).toBe(3)
		expectValue(values[2], catchMapper(1))
	})

	test("unwrap should accept WrappedObservable<T> and return Observable<T>", () => {
		const s = new Subject<number>()
		const mapped = s.pipe(map(identity), unwrap())
		const values: number[] = []
		const errors: Array<any> = []
		mapped.subscribe(
			x => values.push(x),
			x => errors.push(x)
		)
		expect(values.length).toBe(0)

		s.next(1)
		expect(values.length).toBe(1)
		expect(values[0]).toBe(1)
	})

	test("unwrap should throw error if receive rejected status", () => {
		const s = new Subject<Wrapped<number>>()
		const original = s.pipe(map(identity))
		const unwrapped = original.pipe(unwrap())
		const originalValues: Wrapped<number>[] = []
		const values: number[] = []
		const unwrappedErrors: any[] = []
		unwrapped.subscribe(
			x => values.push(x),
			x => unwrappedErrors.push(x)
		)
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

function expectValue<T>(value: Wrapped<T>, expectedValue: T) {
	expect(value.status).toEqual("fulfilled")
	expect((value as Fulfilled<T>).value).toEqual(expectedValue)
}
