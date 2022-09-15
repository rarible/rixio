import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { SimpleCache } from "@rixio/lens"
import { Observable, Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { CacheState, CacheIdle, KeyEvent, createErrorKeyEvent, createAddKeyEvent, ListDataLoader } from "../domain"
import { Batcher } from "../utils/batcher"
import { Memo, MemoImpl } from "../memo"
import { KeyNotFoundError, UnknownError } from "../utils/errors"
import { byKeyWithDefaultFactory } from "../utils/by-key-with-default-factory"

export interface KeyMemo<K, V> {
	get: (key: K, force?: boolean) => Promise<V>
	set: (key: K, value: V) => void
	getAtom: (key: K) => Atom<CacheState<V>>
	single: (key: K) => Memo<V>
}

export class KeyMemoImpl<K, V> implements KeyMemo<K, V> {
	private readonly _batch: Batcher<K>
	private readonly _results = new Subject<[K, V | Error]>()
	private readonly _lensFactory = byKeyWithDefaultFactory<K, CacheState<V>>(() => CacheIdle.create())
	private readonly _events = new Subject<KeyEvent<K>>()
	readonly events: Observable<KeyEvent<K>> = this._events

	private readonly singles = new SimpleCache<K, Memo<V>>(key => {
		return new MemoImpl(this.getAtom(key), () => this.load(key))
	})

	constructor(
		private readonly map: Atom<IM<K, CacheState<V>>>,
		private readonly loader: ListDataLoader<K, V>,
		timeout: number = 100
	) {
		this._batch = new Batcher<K>(async keys => {
			try {
				const values = await this.loader(keys)
				const map = IM(values)
				keys.forEach(key => {
					this._results.next([key, map.has(key) ? map.get(key)! : new KeyNotFoundError(key)])
				})
			} catch (e) {
				keys.forEach(k => {
					this._events.next(createErrorKeyEvent(k, e))
					this._results.next([k, UnknownError.create(e, `Can't load entry with key ${k}`)])
				})
			}
		}, timeout)
	}

	single = (key: K): Memo<V> =>
		this.singles.getOrCreate(key, () => {
			this._events.next(createAddKeyEvent(key))
		})

	get = (key: K, force?: boolean): Promise<V> => this.single(key).get(force)
	set = (key: K, value: V): void => this.single(key).set(value)
	getAtom = (key: K): Atom<CacheState<V>> => this.map.lens(this._lensFactory(key))

	private async load(key: K): Promise<V> {
		this._batch.add(key)
		const [, v] = await this._results
			.pipe(
				filter(([k]) => key === k),
				first()
			)
			.toPromise()
		if (v instanceof Error) {
			this._events.next(createErrorKeyEvent(key, v))
			throw v
		}
		return v
	}
}
