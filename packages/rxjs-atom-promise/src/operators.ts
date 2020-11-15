/* eslint-disable @typescript-eslint/no-unused-vars */
import { Observable } from "rxjs"
import { WrappedRx } from "./cache-state"


export interface F<T, R> { (t: T): R }

declare function map<T, R>(mapper: (value: T) => R): F<Observable<WrappedRx<T> | T>, Observable<WrappedRx<R>>>

declare function flatMap<T, R>(mapper: (value: T) => PromiseLike<R>): F<Observable<WrappedRx<T> | T>, Observable<WrappedRx<R>>>
declare function flatMap<T, R>(mapper: (value: T) => Observable<R | WrappedRx<R>>): F<Observable<WrappedRx<T> | T>, Observable<WrappedRx<R>>>

function test(
	o1: Observable<WrappedRx<number>>,
	o2: Observable<number>,
	f1: (n: number) => Observable<string>,
	f2: (n: number) => Observable<WrappedRx<string>>,
) {
	const v1: Observable<WrappedRx<string>> = o1.pipe(map(x => `${x}`))
	const v2: Observable<WrappedRx<string>> = o1.pipe(flatMap(x => Promise.resolve(`${x}`)))
	const v3: Observable<WrappedRx<string>> = o1.pipe(flatMap(f1))
	const v4: Observable<WrappedRx<string>> = o1.pipe(flatMap(f2))

	const v12: Observable<WrappedRx<number>> = o2.pipe(
		map(x => `${x}`),
		map(s => parseInt(s + "1"))
	)
	const v22: Observable<WrappedRx<string>> = o2.pipe(flatMap(x => Promise.resolve(`${x}`)))
	const v32: Observable<WrappedRx<string>> = o2.pipe(flatMap(f1))
	const v42: Observable<WrappedRx<string>> = o2.pipe(flatMap(f2))

}

