import { Observable } from "rxjs"
import { useRef } from "react"
import { useSubscription } from "./use-subscription"

export function useRxChange<T>(
	observable: Observable<T>, observer: ((value: T) => void), deps: any[] = [],
) {
	const ref = useRef<T>()
	useSubscription(observable, v => {
		if (ref.current !== v) {
			ref.current = v
			observer(v)
		}
	}, deps)
}
