import * as console from "console"
import type { Atom } from "@rixio/atom"
import { Observable, Subscriber, Subscription } from "rxjs"
import { first } from "rxjs/operators"
import { CacheState, createFulfilledCache, idleCache } from "./domain"
import { save } from "./impl"
import { MappedBus } from "./mapped-bus"

export interface Memo<T> extends Observable<T> {
	get(force?: boolean): Promise<T>
	set(value: T): void

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void

	clear(): void

	atom: Atom<CacheState<T>>
}

export class MemoImpl<T> extends MappedBus<CacheState<T>, T> implements Memo<T> {
	private _current: T | undefined = undefined

	constructor(private readonly _atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom)
		this.clear = this.clear.bind(this)
		this.get = this.get.bind(this)
	}

	get atom(): Atom<CacheState<T>> {
		return this._atom
	}

	get(force: boolean = false): Promise<T> {
		if (force) {
			this.clear()
		}
		return this.pipe(first()).toPromise()
	}

	set(value: T): void {
		this.atom.set(createFulfilledCache(value))
	}

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void {
		this.atom.modify(s => {
			if (s.status === "fulfilled") {
				return { ...s, value: updateFn(s.value) }
			} else {
				return s
			}
		})
	}

	clear(): void {
		this.atom.set(idleCache as CacheState<T>)
	}

	_subscribe(subscriber: Subscriber<T>): Subscription {
		let value = this._atom.get();
		if (value.status === "rejected") {
			save(this._loader(), this._atom).then()
		}
		if (value.status === "fulfilled") {
			subscriber.next(value.value)
		}
		return super._subscribe(subscriber);
	}

	protected _onValue(x: CacheState<T>) {
		console.log("_onValue", x)
		switch (x.status) {
			case "idle":
				save(this._loader(), this._atom).then()
				break
			case "pending":
				break
			case "rejected":
				this.error(x.error)
				break
			case "fulfilled":
				if (x.value !== this._current) {
					this._current = x.value
					this.next(x.value)
				}
		}
	}
}

