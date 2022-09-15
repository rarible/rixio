import { identity, of, Subject, Subscription, throwError } from "rxjs"
import { Wrapped, WrappedFulfilled, WrappedRejected } from "../domain"
import { catchError, combineLatest, filter, flatMap, map, switchMap, unwrap, from, defer } from "./index"

describe("operators", () => {
	test("map should work with plain observables", () => {
		const s = new Subject<number>()
		const emitted: Wrapped<string>[] = []
		const sub = s.pipe(map(x => `${x}`)).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(1)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], "1")

		sub.unsubscribe()
	})

	test("map should catch error in mapper function", () => {
		const s = new Subject<number>()
		const ERROR = "error"
		const emitted: Wrapped<string>[] = []
		const sub = s
			.pipe(
				map(() => {
					throw new Error(ERROR)
				})
			)
			.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(1)
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		expect((emitted[1] as any).error.message).toBe(ERROR)

		sub.unsubscribe()
	})

	test("combineLatest should lift plain observables", () => {
		const n = new Subject<number>()
		const s = new Subject<string>()

		const emitted: Wrapped<[number, string]>[] = []
		const sub = combineLatest([n, s]).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		n.next(1)
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("pending")

		s.next("s1")
		expect(emitted.length).toBe(3)
		expect(emitted[2].status).toBe("fulfilled")
		expect((emitted[2] as any).value).toStrictEqual([1, "s1"])

		s.error("reason-string")
		expect(emitted.length).toBe(4)
		expect(emitted[3].status).toBe("rejected")
		expect((emitted[3] as any).error).toBe("reason-string")

		sub.unsubscribe()
	})

	test("combineLatest should work with empty arrays", async () => {
		const emitted: Wrapped<[]>[] = []
		const sub = combineLatest([]).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("fulfilled")
		expect((emitted[0] as any).value).toStrictEqual([])

		sub.unsubscribe()
	})

	test("flatMap should work with Promises", async () => {
		const s = new Subject<string>()

		const emitted: Wrapped<number>[] = []
		const sub = s.pipe(flatMap(x => delay(100).then(() => parseInt(x)))).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next("1")
		expect(emitted.length).toBe(1)

		await delay(120)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 1)
		sub.unsubscribe()
	})

	test("flatMap should save reload function", async () => {
		const s = new Subject<Wrapped<string>>()

		const emitted: Wrapped<number>[] = []
		const sub = s.pipe(flatMap(x => delay(100).then(() => parseInt(x)))).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		const reload = jest.fn()
		s.next(WrappedRejected.create("reason1", reload))
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		const rej = emitted[1] as WrappedRejected
		expect(rej.error).toBe("reason1")
		expect(reload.mock.calls.length).toEqual(0)
		rej.reload()
		expect(reload.mock.calls.length).toEqual(1)

		sub.unsubscribe()
	})

	test("flatMap shouldn't cancel previous emits", async () => {
		const s = new Subject<Wrapped<string>>()

		let index = 0
		const emitted: Wrapped<number>[] = []
		const sub = s
			.pipe(
				flatMap(async x => {
					if (index === 0) {
						index = index + 1
						await delay(100)
					}
					return parseInt(x)
				})
			)
			.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(WrappedFulfilled.create("10"))
		s.next(WrappedFulfilled.create("15"))

		await delay(16)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 15)

		await delay(100)
		expect(emitted.length).toBe(3)
		expectValue(emitted[2], 10)
		expect(emitted[2].status).toBe("fulfilled")
		expect((emitted[2] as any).value).toBe(10)

		sub.unsubscribe()
	})

	test("switchMap should save reload function", () => {
		const s = new Subject<Wrapped<string>>()

		const emitted: Wrapped<number>[] = []
		const sub = s.pipe(switchMap(x => delay(100).then(() => parseInt(x)))).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		const reload = jest.fn()
		s.next(WrappedRejected.create("reason1", reload))
		expect(emitted.length).toBe(2)
		expect(emitted[1].status).toBe("rejected")
		const rej = emitted[1] as WrappedRejected
		expect(rej.error).toBe("reason1")
		expect(reload.mock.calls.length).toEqual(0)
		rej.reload()
		expect(reload.mock.calls.length).toEqual(1)

		sub.unsubscribe()
	})

	test("switchMap should cancel previous emits", async () => {
		const s = new Subject<Wrapped<string>>()

		let index = 0
		const emitted: Wrapped<number>[] = []
		const sub = s
			.pipe(
				switchMap(async x => {
					if (index === 0) {
						index = index + 1
						await delay(100)
					}
					return parseInt(x)
				})
			)
			.subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(WrappedFulfilled.create("10"))
		s.next(WrappedFulfilled.create("15"))

		await delay(120)
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 15)

		sub.unsubscribe()
	})

	test("filter should filter out even numbers", () => {
		const s = new Subject<Wrapped<number>>()

		const emitted: Wrapped<number>[] = []
		const sub = s.pipe(filter(x => x % 2 === 0)).subscribe(v => emitted.push(v))
		expect(emitted.length).toBe(1)
		expect(emitted[0].status).toBe("pending")

		s.next(WrappedFulfilled.create(5))
		expect(emitted.length).toBe(1)

		s.next(WrappedFulfilled.create(10))
		expect(emitted.length).toBe(2)
		expectValue(emitted[1], 10)

		sub.unsubscribe()
	})

	test("catchError should map rejected status of Wrapped", () => {
		const catchMapper = (x: unknown) => {
			if (typeof x === "number") return of(x + 2)
			return throwError("Non-parasable value")
		}
		const s = new Subject<Wrapped<number>>()
		const values: Wrapped<number>[] = []
		const sub = s.pipe(catchError(catchMapper)).subscribe(x => values.push(x))
		expect(values.length).toBe(1)
		expect(values[0].status).toBe("pending")

		s.next(WrappedFulfilled.create(1))
		expect(values.length).toBe(2)
		expectValue(values[1], 1)
		s.next(WrappedRejected.create(1))
		expect(values.length).toBe(3)
		expectValue(values[2], 3)

		sub.unsubscribe()
	})

	test("unwrap should accept WrappedObservable<T> and return Observable<T>", () => {
		const s = new Subject<number>()
		const values: number[] = []
		const errors: Array<any> = []
		const sub = s.pipe(map(identity), unwrap()).subscribe(
			x => values.push(x),
			x => errors.push(x)
		)
		expect(values.length).toBe(0)

		s.next(1)
		expect(values.length).toBe(1)
		expect(values[0]).toBe(1)

		sub.unsubscribe()
	})

	test("unwrap should throw error if receive rejected status", () => {
		const s = new Subject<Wrapped<number>>()
		const original = s.pipe(map(identity))
		const unwrapped = original.pipe(unwrap())
		const originalValues: Wrapped<number>[] = []
		const values: number[] = []
		const unwrappedErrors: any[] = []
		const sub = new Subscription()
		sub.add(
			unwrapped.subscribe(
				x => values.push(x),
				x => unwrappedErrors.push(x)
			)
		)
		sub.add(original.subscribe(x => originalValues.push(x)))
		expect(values.length).toBe(0)
		expect(originalValues.length).toBe(1)
		expect(originalValues[0].status).toBe("pending")

		const ERROR = "error"
		s.next(WrappedRejected.create(ERROR))
		expect(unwrappedErrors.length).toBe(1)
		expect(unwrappedErrors[0]).toBe(ERROR)

		sub.unsubscribe()
	})

	test("from should receive value after promise fulfill", async () => {
		const promise = delay(100).then(() => 10)
		const emitted: Wrapped<number>[] = []
		const sub = from(promise).subscribe(x => emitted.push(x))
		expect(emitted.length).toEqual(1)
		expect(emitted[0].status).toEqual("pending")

		await delay(120)
		expect(emitted.length).toEqual(2)
		expectValue(emitted[1], 10)

		sub.unsubscribe()
	})

	test("defer should receive value only after subscribe", async () => {
		let called = false
		const getSomething = async () => {
			called = true
			await delay(100)
			return 10
		}
		const emitted: Wrapped<number>[] = []
		const observable = defer(() => getSomething())

		await delay(120)
		expect(called).toEqual(false)

		const sub = observable.subscribe(x => emitted.push(x))
		expect(called).toEqual(true)
		expect(emitted.length).toEqual(1)
		expect(emitted[0].status).toEqual("pending")

		await delay(120)
		expect(emitted.length).toEqual(2)
		expectValue(emitted[1], 10)

		sub.unsubscribe()
	})
})

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}

function expectValue<T>(value: Wrapped<T>, expectedValue: T) {
	expect(value.status).toEqual("fulfilled")
	expect((value as WrappedFulfilled<T>).value).toEqual(expectedValue)
}
