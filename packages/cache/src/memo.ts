import * as console from "console"
import type { Atom } from "@rixio/atom"
import { noop, Observable, Subscriber, Subscription } from "rxjs"
import { first, skip } from "rxjs/operators"
import { Observer, SubscriptionLike } from "rxjs/src/internal/types"
import { MappedReplaySubject } from "./mapped-replay-subject"
import { CacheState, createFulfilledCache, idleCache } from "./domain"
import { save } from "./impl"

export interface Memo<T> extends Observable<T> {
	get(force?: boolean): Promise<T>
	set(value: T): void

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void

	clear(): void

	atom: Atom<CacheState<T>>
}

export class MemoImpl<T> extends MappedReplaySubject<CacheState<T>, T> implements Memo<T> {
	private skip: number = 0
	private shouldRefetch = false

	constructor(private readonly _atom$: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom$, 1)
	}

	get atom(): Atom<CacheState<T>> {
		return this._atom$
	}

	get(force = false): Promise<T> {
		if (force || this.hasError) {
			this.clear()
		}
		return this.pipe(skip(Math.max(this.skip, 0)), first()).toPromise()
	}

	set(value: T): void {
		this._atom$.set(createFulfilledCache(value))
	}

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void {
		this._atom$.modify(s => {
			if (s.status === "fulfilled") {
				return {
					...s,
					value: updateFn(s.value),
				}
			}
			return s
		})
	}

	clear(): void {
		this.skip = this.skip + 1
		this._atom$.set(idleCache)
	}

	protected _onValue(x: CacheState<T>) {
		console.log(x.status)
		switch (x.status) {
			case "idle":
				save(this._loader(), this._atom$).catch(noop)
				break
			case "rejected":
				if (this.shouldRefetch) {
					console.log("refetching")
					save(this._loader(), this._atom$).catch(noop)
					this.shouldRefetch = false
				} else {
					this.error(x.error)
					this.shouldRefetch = true
				}
				break
			case "fulfilled":
				this.next(x.value)
				break
		}
	}
}

export class NewMemoImpl<T> extends MappedReplaySubject<CacheState<T>, T> implements Memo<T> {
	private _current: T | undefined = undefined

	constructor(private readonly _atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom, 1)
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
		if (this._atom.get().status === "rejected") {
			this.clear()
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


export class Bus<T> extends Observable<T> implements SubscriptionLike {
	readonly closed: boolean = false

	observers: Observer<T>[] = [];

	constructor() {
		super();
	}

	next(value: T) {
		const { observers } = this;
		const copy = observers.slice();
		const len = copy.length;
		for (let i = 0; i < len; i++) {
			copy[i].next(value);
		}
	}

	error(err: any) {
		const { observers } = this;
		const copy = observers.slice();
		const len = copy.length;
		for (let i = 0; i < len; i++) {
			copy[i].error(err);
		}
		//todo need this? this.observers.length = 0;
	}

	complete() {
		const { observers } = this;
		const copy = observers.slice();
		const len = copy.length;
		for (let i = 0; i < len; i++) {
			copy[i].complete();
		}
		//todo need this? this.observers.length = 0;
	}

	unsubscribe() {
		this.observers.length = 0;
	}

	/** @deprecated This is an internal implementation detail, do not use. */
	_subscribe(subscriber: Subscriber<T>): Subscription {
		this.observers.push(subscriber);
		return new BusSubscription(this, subscriber)
	}

	/**
	 * Creates a new Observable with this Bus as the source. You can do this
	 * to create customize Observer-side logic of the Subject and conceal it from
	 * code that uses the Observable.
	 * @return {Observable} Observable that the Subject casts to
	 */
	asObservable(): Observable<T> {
		const observable = new Observable<T>();
		(<any>observable).source = this;
		return observable;
	}
}

export class BusSubscription<T> extends Subscription {
	closed: boolean = false;

	constructor(public bus: Bus<T>, public subscriber: Observer<T>) {
		super();
	}

	unsubscribe() {
		if (this.closed) {
			return;
		}

		this.closed = true;
		const observers = this.bus.observers;

		if (!observers || observers.length === 0) {
			return;
		}

		const subscriberIndex = observers.indexOf(this.subscriber);

		if (subscriberIndex !== -1) {
			observers.splice(subscriberIndex, 1);
		}
	}
}
