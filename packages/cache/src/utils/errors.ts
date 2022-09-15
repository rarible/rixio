export class KeyNotFoundError<T> extends Error {
	constructor(key: T) {
		super(`Entity with key "${key}" not found`)
	}
}

export class UnknownError<T> extends Error {
	static create(originalError: unknown, fallbackMessage: string) {
		if (originalError instanceof Error) return originalError
		return new UnknownError(fallbackMessage)
	}
}
