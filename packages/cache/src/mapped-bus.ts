import { Observable, SchedulerLike, Subscriber, Subscription } from "rxjs"
import { Observer, SubscriptionLike } from "rxjs/src/internal/types";

class Bus<T> extends Observable<T> implements SubscriptionLike {
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

export abstract class MappedBus<S, T> extends Bus<T> {
	protected _subscription: Subscription | null = null
	private _refCount = 0

	protected constructor(
		protected readonly _observable: Observable<S>
	) {
		super()
	}

	protected abstract _onValue(source: S): void

	_subscribe(subscriber: Subscriber<T>): Subscription {
		if (!this._subscription) {
			this._subscription = this._observable.subscribe(v => this._onValue(v))
		}
		this._refCount = this._refCount + 1

		const sub = new Subscription(() => {
			this._refCount = this._refCount - 1
			if (this._refCount <= 0 && this._subscription) {
				this._subscription.unsubscribe()
				this._subscription = null
			}
		})
		sub.add(super._subscribe(subscriber))
		return sub
	}

	unsubscribe() {
		if (this._subscription) {
			this._subscription.unsubscribe()
			this._subscription = null
		}
		this._refCount = 0
		super.unsubscribe()
	}
}
