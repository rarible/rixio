import { Map as IM } from "immutable"
import { Atom } from "@rixio/rxjs-atom"
import { Lens, Prism } from "@rixio/lens"
import { Subject, ReplaySubject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { CacheImpl } from "./impl"
import { BatchHelper } from "./key-batch"
import { Cache, CacheState, createFulfilledCache, idleCache, pendingCache } from "./index"

export type DataLoader<K, V> = (key: K) => Promise<V>

export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>

export function toListDataLoader<K, V>(loader: DataLoader<K, V>): ListDataLoader<K, V> {
	return (ids) => Promise.all(ids.map(id => loader(id).then(v => [id, v] as [K, V])))
}

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>

	set(key: K, value: V): void

	getMap(ids: K[]): Promise<IM<K, V>>

	getAtom(key: K): Atom<CacheState<V>>

	single(key: K): Cache<V>
}

//todo we can schedule all requests to individual items and load them in batch (if supported)
export class KeyCacheImpl<K, V> implements KeyCache<K, V> {
	private readonly singles: Map<K, Cache<V>> = new Map()
	private readonly batchHelper: BatchHelper<K>
	private readonly results: Subject<[K, V | undefined]> = new ReplaySubject(0)

	constructor(
		private readonly map: Atom<IM<K, CacheState<V>>>,
		private readonly loader: ListDataLoader<K, V>,
		timeout: number = 50,
	) {
		this.onBatchLoad = this.onBatchLoad.bind(this)
		this.batchHelper = new BatchHelper<K>(this.onBatchLoad, timeout)
	}

	private async onBatchLoad(keys: K[]) {
		const values = await this.loader(keys)
		const map = IM(values)
		keys.forEach(key => {
			const value = map.get(key)
			this.results.next([key, value])
		})
	}

	single(key: K): Cache<V> {
		const existing = this.singles.get(key)
		if (existing) {
			return existing
		}
		const created = new CacheImpl(this.getAtom(key), () => this.load(key))
		this.singles.set(key, created)
		return created
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.map.modify(map => map.set(key, createFulfilledCache(value)))
	}

	getAtom(key: K): Atom<CacheState<V>> {
		return this.map.lens(byKeyWithDefault(key, idleCache))
	}

	async getMap(ids: K[]) {
		const current = this.map.get()
		current.entries()
		const notLoaded = ids.filter(x => {
			const state = current.get(x)
			return !state || state.status === "idle"
		})
		//todo do not use reduce. change Map at once
		//todo error handling. should we mark items as errors?
		this.map.modify(map => notLoaded.reduce((map, id) => map.set(id, pendingCache), map))
		const values = await this.loader(notLoaded)
		this.map.modify(map => values.reduce((map, [id, v]) => map.set(id, createFulfilledCache(v)), map))
		const allValues = await Promise.all(ids.map(id => this.get(id).then(v => [id, v] as [K, V])))
		return IM(allValues)
	}

	private async load(key: K): Promise<V> {
		this.batchHelper.add(key)
		const [, v] = await this.results.pipe(
			filter(([k, v]) => key === k),
			first(),
		).toPromise()
		if (v !== undefined) {
			return v
		}
		throw new Error("Not found")
	}
}

export function byKey<K, V>(key: K): Prism<IM<K, V>, V> {
	return Prism.create(
		map => map.get(key),
		(v, map) => map.set(key, v),
	)
}

export function byKeyWithDefault<K, V>(key: K, defaultValue: V): Lens<IM<K, V>, V> {
	return Lens.create(
		map => map.get(key) || defaultValue,
		(v, map) => map.set(key, v),
	)
}
