import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { SimpleCache } from "@rixio/lens"
import { Observable, Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { CacheState, idleCache, isNotFound, createAddEvent, UNDEFINED, KeyEvent } from "./domain"
import { BatchHelper } from "./key-batch"
import { byKeyWithDefaultFactory, ListDataLoader } from "./key"
import { Memo, MemoImpl } from "./memo"

export interface KeyMemo<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Memo<V>
}

export class KeyMemoImpl<K, V> implements KeyMemo<K, V> {
	private readonly _batch: BatchHelper<K>
	private readonly _results = new Subject<[K, V | typeof UNDEFINED]>()
	private readonly _lensFactory = byKeyWithDefaultFactory<K, CacheState<V>>(idleCache)
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
		this._batch = new BatchHelper<K>(async keys => {
			try {
				const values = await this.loader(keys)
				values.forEach(([key, value]) => {
					this._results.next([key, value])
				})
			} catch (e) {
				console.error(e)
				keys.forEach(k => {
					this._results.next([k, UNDEFINED])
				})
			}
		}, timeout)
	}

	single(key: K): Memo<V> {
		return this.singles.getOrCreate(key, () => {
			this.onCreate(key)
		})
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.single(key).set(value)
	}

	onCreate(key: K) {
		this._events.next(createAddEvent(key))
	}

	getAtom(key: K): Atom<CacheState<V>> {
		return this.map.lens(this._lensFactory(key))
	}

	private async load(key: K): Promise<V> {
		this._batch.add(key)
		const [, v] = await this._results
			.pipe(
				filter(([k]) => key === k),
				first()
			)
			.toPromise()
		if (isNotFound(v)) {
			throw new Error(`Entity with key "${key}" not found`)
		}
		return v
	}
}
