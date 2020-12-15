import { Observable, PartialObserver } from "rxjs"
import { useEffect } from "react"

export function useSubscription<T>(
	observable: Observable<T>,
	observer?: PartialObserver<T> | ((value: T) => void),
	deps: any[] = []
) {
	useEffect(() => {
		if (typeof observer === "function") {
			const s = observable.subscribe(observer)
			return () => {
				s.unsubscribe()
			}
		} else {
			const s = observable.subscribe(observer)
			return () => {
				s.unsubscribe()
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [observable, ...deps])
}
