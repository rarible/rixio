export class KeyNotFoundError<T> extends Error {
  readonly name = "KeyNotFoundError"
  constructor(key: T) {
    super(`Entity with key "${key}" not found`)
  }
}

export class UnknownError extends Error {
  readonly name = "UnknownError"
  static create(originalError: unknown, fallbackMessage: string) {
    if (originalError instanceof Error) return originalError
    return new UnknownError(fallbackMessage)
  }
}
