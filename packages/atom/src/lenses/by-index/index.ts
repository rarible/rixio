import { Lens } from "@rixio/lens"

/**
 * Creates lens that uses indexed value from array
 * if value is not exist in array then it replaced with defaultValue
 */

export function byIndexFactory<T>(index: number, createDefaultValue: () => T): Lens<T[], T> {
	return Lens.create<T[], T>(
		x => x[index] || createDefaultValue(),
		(x, xs) => {
			const result = [...xs]
			result[index] = x || createDefaultValue()
			return result
		}
	)
}
