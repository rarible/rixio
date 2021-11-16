import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { SimpleCache } from "@rixio/lens"
import { Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { BatchHelper } from "../utils/batch-helper"
import { byKeyWithDefaultFactory } from "../utils"
import { CacheImpl } from "../cache"
import { createAddEvent, isNotFound, KeyEvent, ListDataLoader, NotFound, UNDEFINED } from "../common/domain"
import { CacheState, createFulfilledCache, idleCache } from "../common/domain"
import { Cache } from "../cache"

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Cache<V>
}

/**
 * @deprecated this type of cache deprecated
 * please use key-memo instead
 */

export class KeyCacheImpl<K, V> implements KeyCache<K, V> {
	private readonly batchHelper: BatchHelper<K>
	private readonly results = new Subject<[K, V | NotFound]>()
	private readonly lensFactory = byKeyWithDefaultFactory<K, CacheState<V>>(idleCache)
	private readonly _events = new Subject<KeyEvent<K>>()
	readonly events = this._events.pipe()

	private readonly singles = new SimpleCache<K, Cache<V>>(key => {
		return new CacheImpl(this.getAtom(key), () => {
			return this.load(key)
		})
	})

	constructor(
		private readonly map: Atom<IM<K, CacheState<V>>>,
		private readonly loader: ListDataLoader<K, V>,
		timeout: number = 100
	) {
		this.onBatchLoad = this.onBatchLoad.bind(this)
		this.batchHelper = new BatchHelper<K>(this.onBatchLoad, timeout)
	}

	private async onBatchLoad(keys: K[]) {
		try {
			const values = await this.loader(keys)
			values.forEach(([key, value]) => {
				this.results.next([key, value])
			})
		} catch (e) {
			console.error(e)
			keys.forEach(k => {
				this.results.next([k, UNDEFINED])
			})
		}
	}

	single(key: K): Cache<V> {
		return this.singles.getOrCreate(key, () => {
			this.onCreate(key)
		})
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.map.modify(x => {
			return x.set(key, createFulfilledCache(value))
		})
		this.onCreate(key)
	}

	onCreate(key: K) {
		this._events.next(createAddEvent(key))
	}

	getAtom(key: K): Atom<CacheState<V>> {
		return this.map.lens(this.lensFactory(key))
	}

	private async load(key: K): Promise<V> {
		this.batchHelper.add(key)
		const [, v] = await this.results
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
