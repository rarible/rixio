import { Observable } from "rxjs"
import { Fulfilled, Pending, Rejected, Wrapped } from "@rixio/rxjs-wrapped";
import { Atom } from "@rixio/rxjs-atom"

export type Idle = {
	status: "idle"
}

export const idle: Idle = { status: "idle" }

type AtomState<S, T> = Omit<S, "reload">
export type CacheState<T> = AtomState<Idle, T> | AtomState<Pending, T> | AtomState<Rejected, T> | AtomState<Fulfilled<T>, T>

export interface Cache<T> extends Observable<Wrapped<T>> {
	get(force?: boolean): Promise<T>

	set(value: T): void

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void

	clear(): void

	atom: Atom<CacheState<T>>

	valueAtom: Atom<T>
}
