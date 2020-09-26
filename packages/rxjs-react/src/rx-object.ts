import { Lifted } from "./base"
import { combineLatest, Observable, of } from "rxjs"
import { Lens } from "@rixio/lens"
import { map } from "rxjs/operators"


type InferObservableValue<O extends ObservableLike<any>> = O extends Observable<infer T> ? T : O
type InferObservableInTuple<A extends [...ObservableLike<any>[]]> = { [I in keyof A]: InferObservableValue<A[I]> }
type InferLiftedValue<L extends Lifted<any>> = L extends Lifted<infer T> ? T : L
export function rxObject<A extends [...ObservableLike<any>[]]>(lifted: [...A]): Observable<InferObservableInTuple<A>>
export function rxObject<L extends Lifted<any>>(lifted: L): Observable<InferLiftedValue<L>>
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
