import { BehaviorSubject, Observable, Subscriber, Subscription } from "rxjs";

export abstract class MappedSubject<S, T> extends BehaviorSubject<T> {
  protected _subscription: Subscription | null = null
  private _refCount = 0

  protected constructor(protected readonly _observable: Observable<S>, initial: T) {
    super(initial)
  }

  protected abstract _onValue(source: S): void

  _subscribe(subscriber: Subscriber<T>): Subscription {
    // tslint:disable-line function-name
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
      if (!this._subscription.closed) {
        this._subscription.unsubscribe()
      }
      this._subscription = null
    }
    this._refCount = 0

    super.unsubscribe()
  }
}
