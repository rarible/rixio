import { Observable } from "rxjs"
import { useSubscription } from "./use-subscription"
import { useRef } from "react"

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
