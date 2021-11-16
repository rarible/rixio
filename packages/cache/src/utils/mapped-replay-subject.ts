import { Observable, ReplaySubject, SchedulerLike, Subscriber, Subscription } from "rxjs"

export abstract class MappedReplaySubject<S, T> extends ReplaySubject<T> {
	protected _subscription: Subscription | null = null
	private _refCount = 0

	protected constructor(
		protected readonly _observable: Observable<S>,
		bufferSize?: number | undefined,
		windowTime?: number | undefined,
		scheduler?: SchedulerLike | undefined
	) {
		super(bufferSize, windowTime, scheduler)
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
