import { DataLoader, ListDataLoader } from "../../domain"

export function toListLoader<K, V>(
	loader: DataLoader<K, V>,
	createFallback?: (key: K, error: unknown) => V
): ListDataLoader<K, V> {
	return async keys => {
		const map = new Map<K, [K, V]>()
		await Promise.all(
			keys.map(key =>
				loader(key)
					.then(v => map.set(key, [key, v]))
					.catch(error => {
						if (createFallback) {
							map.set(key, [key, createFallback(key, error)])
						}
					})
			)
		)
		const results: [K, V][] = []
		keys.forEach(key => {
			if (map.has(key)) {
				results.push(map.get(key)!)
			}
		})
		return results
	}
}
