export class KeyNotFoundError<T> extends Error {
	constructor(key: T) {
		super(`Entity with key "${key}" not found`)
	}
}

export class UnknownError<T> extends Error {}
