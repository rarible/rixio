import { Lifted } from "./base"
import { combineLatest, Observable, of } from "rxjs"
import { Lens } from "@rixio/lens"
import { map } from "rxjs/operators"



type InferObservableInTuple<T extends any[]> = {
	[I in keyof T]: T[I] extends Observable<infer T> ? T : T[I]
}
export declare function rxObject<T extends any[]>(lifted: [...T]): Observable<InferObservableInTuple<T>>
export declare function rxObject<T>(lifted: Lifted<T>): Observable<T>
export function rxObject(lifted: any): Observable<any> {
	const observables: Observable<any>[] = []
	const lenses: Lens<Lifted<T>, any>[] = []
	walk(lifted, (value, lens) => {
		if (value instanceof Observable) {
			observables.push(value)
			lenses.push(lens)
		}
	})
	if (observables.length === 0) {
		return of(lifted as T)
	}
	return combineLatest(observables).pipe(
		map(values => lenses.reduce((acc, l, idx) => l.set(values[idx], acc), lifted) as T),
	)
}

function walk<T extends object>(
	props: T,
	handler: (value: any, lens: Lens<T, any>) => void,
) {
	for (const key in props) {
		if (props.hasOwnProperty(key)) {
			const prop = props[key] as any
			handler(prop, Lens.key(key) as any)
		}
	}
}
