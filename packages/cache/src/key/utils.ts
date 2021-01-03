import { DataLoader, ListDataLoader } from "./domain"

export function toListDataLoader<K, V>(loader: DataLoader<K, V>): ListDataLoader<K, V> {
	return ids => Promise.all(ids.map(id => loader(id).then(v => [id, v] as [K, V])))
}
