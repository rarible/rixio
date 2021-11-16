export type DataLoader<K, V> = (key: K) => Promise<V>
export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>

export type KeyEventType = "add" | "remove"
export interface KeyEvent<K> {
	type: KeyEventType
	key: K
}

export function createAddEvent<T>(key: T) {
	return {
		key,
		type: "add" as const,
	}
}

export const UNDEFINED = Symbol.for("UNDEFINED")
export type NotFound = typeof UNDEFINED
export function isNotFound(value: unknown): value is NotFound {
	return value === UNDEFINED
}
