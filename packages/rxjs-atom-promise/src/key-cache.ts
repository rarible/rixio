import { Map as IM } from "immutable"
import { Atom } from "@rixio/rxjs-atom"
import { Lens, Prism } from "@rixio/lens"
import {
	getFinalValue,
	PromiseState,
	createPromiseStateFulfilled,
	createPromiseStateIdle,
	createPromiseStatePending,
} from "./promise-state"
import { Cache, CacheImpl } from "./cache"
import { save } from "./save"

export interface DataLoader<K, V> {
	load(key: K): Promise<V>
}

export interface ListDataLoader<K, V> {
	loadList(keys: K[]): Promise<[K, V][]>
}

class DefaultListDataLoader<K, V> implements ListDataLoader<K, V> {
	constructor(private readonly loader: DataLoader<K, V>) { }

	loadList(ids: K[]) {
		return Promise.all(
			ids.map(id => this.loader.load(id).then(v => [id, v] as [K, V])),
		)
	}
}

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getMap(ids: K[]): Promise<IM<K, V>>
	getAtom(key: K): Atom<PromiseState<V>>
	single(key: K): Cache<V>
}

//todo we can schedule all requests to individual items and load them in batch (if supported)
export class KeyCacheImpl<K, V> implements KeyCache<K, V> {
	public readonly mapLoader: ListDataLoader<K, V>
	private readonly singles: Map<K, Cache<V>> = new Map()

	constructor(
		private readonly map: Atom<IM<K, PromiseState<V>>>,
		private readonly loader: DataLoader<K, V>,
		listLoader?: ListDataLoader<K, V>,
	) {
		this.mapLoader = listLoader || new DefaultListDataLoader(loader)
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
		return getFinalValue(this.getAtomAndLoad(key, force))
	}

	set(key: K, value: V): void {
		this.map.modify(map => map.set(key, createPromiseStateFulfilled(value)))
	}

	getAtom(key: K): Atom<PromiseState<V>> {
		return this.map.lens(byKeyWithDefault(key, createPromiseStateIdle<V>()))
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
		this.map.modify(map => notLoaded.reduce((map, id) => map.set(id, createPromiseStatePending()), map))
		const values = await this.mapLoader.loadList(notLoaded)
		this.map.modify(map => values.reduce((map, [id, v]) => map.set(id, createPromiseStateFulfilled(v)), map))
		const allValues = await Promise.all(ids.map(id => this.get(id).then(v => [id, v] as [K, V])))
		return IM(allValues)
	}

	private load(key: K): Promise<V> {
		return this.loader.load(key)
	}

	private getAtomAndLoad(key: K, force: boolean = false) {
		const state$ = this.getAtom(key)
		if (force || state$.get().status === "idle") {
			save(this.loader.load(key), state$).then()
		}
		return state$
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
