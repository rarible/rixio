import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { Lens, Prism, SimpleCache } from "@rixio/lens"
import { Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { CacheImpl } from "./impl"
import { BatchHelper } from "./key-batch"
import {
	Cache,
	CacheState,
	createAddKeyEvent,
	createErrorKeyEvent,
	createFulfilledCache,
	idleCache,
	isNotFound,
	KeyEvent,
	UNDEFINED,
} from "./domain"

export type DataLoader<K, V> = (key: K) => Promise<V>

export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>

/**
 * @deprecated please use toListLoader
 * since it can handle errors and doesn't trigger fail of whole chain
 */

export function toListDataLoader<K, V>(loader: DataLoader<K, V>): ListDataLoader<K, V> {
	return ids => Promise.all(ids.map(id => loader(id).then(v => [id, v] as [K, V])))
}

/**
 * Utility to conver your single-loader to list loader
 */

export function toListLoader<K, V, J>(
	loader: DataLoader<K, V>,
	defaultValue: J,
	onError?: (id: K, error: unknown) => void
): ListDataLoader<K, V | J> {
	return ids =>
		Promise.all(
			ids.map(id =>
				loader(id)
					.then(v => [id, v] as [K, V])
					.catch(err => {
						onError?.(id, err)
						return [id, defaultValue] as [K, J]
					})
			)
		)
}

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Cache<V>
}

export class KeyCacheImpl<K, V> implements KeyCache<K, V> {
	private readonly _events: Subject<KeyEvent<K>> = new Subject()
	public readonly events = this._events.pipe()

	private readonly batchHelper: BatchHelper<K>
	private readonly results: Subject<[K, V | typeof UNDEFINED]> = new Subject()
	private readonly lensFactory = byKeyWithDefaultFactory<K, CacheState<V>>(idleCache)

	private readonly singles = new SimpleCache<K, Cache<V>>(key => {
		return new CacheImpl(this.getAtom(key), () => this.load(key))
	})

	constructor(
		private readonly map: Atom<IM<K, CacheState<V>>>,
		private readonly loader: ListDataLoader<K, V>,
		timeout: number = 50
	) {
		this.onBatchLoad = this.onBatchLoad.bind(this)
		this.batchHelper = new BatchHelper<K>(this.onBatchLoad, timeout)
	}

	private async onBatchLoad(keys: K[]) {
		try {
			const values = await this.loader(keys)
			const map = IM(values)
			keys.forEach(key => {
				this.results.next([key, map.has(key) ? map.get(key)! : UNDEFINED])
			})
		} catch (e) {
			keys.forEach(key => {
				this._events.next(createErrorKeyEvent(key, e))
				this.results.next([key, UNDEFINED])
			})
		}
	}

	single(key: K): Cache<V> {
		return this.singles.getOrCreate(key, () => {
			this._events.next(createAddKeyEvent(key))
		})
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.map.modify(x => x.set(key, createFulfilledCache(value)))
		this._events.next(createAddKeyEvent(key))
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
			const error = new Error(`Entity with key "${key}" not found`)
			this._events.next(createErrorKeyEvent(key, error))
			throw error
		}
		return v
	}
}

export function byKey<K, V>(key: K): Prism<IM<K, V>, V> {
	return byKeyCache.getOrCreate(key)
}

export function byKeyWithDefaultFactory<K, V>(defaultValue: V): (key: K) => Lens<IM<K, V>, V> {
	const cache = new SimpleCache<K, Lens<IM<K, V>, V>>((key: K) =>
		Lens.create(
			(map: IM<K, V>) => map.get(key) || defaultValue,
			(v, map) => map.set(key, v)
		)
	)
	return key => cache.getOrCreate(key)
}

export const byKeyCache = new SimpleCache<any, Prism<IM<any, any>, any>>((key: any) =>
	Prism.create(
		(map: IM<any, any>) => map.get(key),
		(v, map) => map.set(key, v)
	)
)
