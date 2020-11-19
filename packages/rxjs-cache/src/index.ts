import { Observable } from "rxjs"
import { Fulfilled, Pending, Wrapped, SimpleRejected } from "@rixio/rxjs-wrapped"
import { Atom } from "@rixio/rxjs-atom"

export type Idle = {
	status: "idle"
}

export const idle: Idle = { status: "idle" }

export type AtomStateStatus = Idle | Pending | SimpleRejected | { status: "fulfilled" }
export type CacheState<T> = Idle | Pending | SimpleRejected | Fulfilled<T>

export interface Cache<T> extends Observable<Wrapped<T>> {
	get(force?: boolean): Promise<T>

	set(value: T): void

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void

	clear(): void

	atom: Atom<CacheState<T>>

	valueAtom: Atom<T>
}
