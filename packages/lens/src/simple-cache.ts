export class SimpleCache<K, V> {
	private readonly map = new Map<K, V>()

	constructor(private readonly factory: (key: K) => V) {}

	getOrCreate(key: K, onCreate?: (next: V) => void): V {
		const cached = this.map.get(key)
		if (cached !== undefined) {
			return cached
		}
		const created = this.factory(key)
		this.map.set(key, created)
		onCreate?.(created)
		return created
	}
}
