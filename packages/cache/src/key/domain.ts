import type { Atom } from "@rixio/atom"
import type { Map } from "immutable"
import type { Cache, CacheState } from "../domain"

export type DataLoader<K, V> = (key: K) => Promise<V>
export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getMap(ids: K[]): Promise<Map<K, V | undefined>>
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Cache<V>
}

export const UNDEFINED = Symbol.for("UNDEFINED")
