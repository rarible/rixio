import { Observable } from "rxjs"
import { map, scan } from "rxjs/operators"

// tslint:disable no-unused-vars
export function reactiveList<TValue>(
	ids: Observable<string[]>,
	createListItem: (x: string) => TValue
): Observable<TValue[]>

export function reactiveList<TValue>(
	ids: Observable<number[]>,
	createListItem: (x: number) => TValue
): Observable<TValue[]>
// tslint:enable no-unused-vars

/**
 * Derive a reactive list from:
 * - an observable of list item ids
 * - a list item factory – a function that will create a list item based on item id.
 */
export function reactiveList<TValue, TKey extends string | number>(
	ids: Observable<TKey[]>,
	createListItem: (x: TKey) => TValue
): Observable<TValue[]> {
	return ids.pipe(
		scan<TKey[], [{ [k: string]: TValue }, TValue[]]>(
			([oldIds, _], ids) => {
				const newIds: { [k: string]: TValue } = {}
				const newValues: TValue[] = Array(ids.length)
				const n = ids.length

				for (let i = 0; i < n; ++i) {
					const id = ids[i]
					const k = id.toString()
					if (k in newIds) {
						newValues[i] = newIds[k]
					} else {
						// eslint-disable-next-line no-multi-assign
						newIds[k] = newValues[i] = k in oldIds ? oldIds[k] : (createListItem as (_: string | number) => TValue)(id)
					}
				}
				return [newIds, newValues]
			},
			[{}, []]
		),
		map(([, values]) => values)
	)
}
