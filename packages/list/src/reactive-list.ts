import type { Observable } from "rxjs"
import { map, scan } from "rxjs/operators"

export function reactiveList<TValue>(
  ids: Observable<string[]>,
  createListItem: (x: string) => TValue,
): Observable<TValue[]>

export function reactiveList<TValue>(
  ids: Observable<number[]>,
  createListItem: (x: number) => TValue,
): Observable<TValue[]>

/**
 * Derive a reactive list from:
 * - an observable of list item ids
 * - a list item factory – a function that will create a list item based on item id.
 */
export function reactiveList<TValue, TKey extends string | number>(
  ids: Observable<TKey[]>,
  createListItem: (x: TKey) => TValue,
): Observable<TValue[]> {
  return ids.pipe(
    scan<TKey[], [{ [k: string]: TValue }, TValue[]]>(
      ([oldIds], ids) => {
        const nextIds: { [k: string]: TValue } = {}
        const nextValues: TValue[] = new Array(ids.length)
        const n = ids.length

        for (let i = 0; i < n; ++i) {
          const id = ids[i]
          const k = id.toString()
          if (k in nextIds) {
            nextValues[i] = nextIds[k]
          } else {
            // eslint-disable-next-line no-multi-assign
            nextIds[k] = nextValues[i] =
              k in oldIds ? oldIds[k] : (createListItem as (_: string | number) => TValue)(id)
          }
        }
        return [nextIds, nextValues]
      },
      [{}, []],
    ),
    map(([, values]) => values),
  )
}
