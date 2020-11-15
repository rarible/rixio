import { WrappedObservable, WrappedRx, wrap } from "./cache-state"
import { useRxWithStatus } from "./use-rx-with-status"

export function useWrappedRx<T>(observable: WrappedObservable<T>): WrappedRx<T> {
	const state: WrappedRx<T | WrappedRx<T>> = useRxWithStatus(observable)
	switch (state.status) {
		case "pending":
			return state as WrappedRx<T>
		case "rejected":
			return state as WrappedRx<T>
		case "fulfilled":
			return wrap(state.value)
	}
}
