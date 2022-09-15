import { noop, Observable } from "rxjs"

export class WrappedBase {}

export class WrappedFulfilled<T> extends WrappedBase {
	readonly status = "fulfilled"
	constructor(public readonly value: T) {
		super()
	}
	static create = <T>(value: T) => new WrappedFulfilled<T>(value)
}

export class WrappedPending extends WrappedBase {
	readonly status = "pending"
	static create = () => new WrappedPending()
}

export class WrappedRejected extends WrappedBase {
	readonly status = "rejected"
	constructor(public readonly error: unknown, public readonly reload: () => void = noop) {
		super()
	}

	static create = (error: unknown, reload: () => void = noop) => new WrappedRejected(error, reload)
}

export type Wrapped<T> = WrappedFulfilled<T> | WrappedPending | WrappedRejected
export type ObservableLike<T> = T | Observable<T> | Observable<Wrapped<T>>

export function isWrapped(value: unknown): value is Wrapped<unknown> {
	return value instanceof WrappedBase
}

export type Lifted<T> = {
	[K in keyof T]: ObservableLike<T[K]>
}
