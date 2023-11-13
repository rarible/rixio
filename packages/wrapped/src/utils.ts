import type { Wrapped } from "./domain"
import { isWrapped, WrappedFulfilled } from "./domain"

/**
 * @deprecated please use it on your own risk
 */

export function toPlainOrThrow<T>(value: Wrapped<T>): T {
  if (value.status === "fulfilled") return value.value
  throw new Error("not fulfilled")
}

export function toWrapped<T>(value: T | Wrapped<T>): Wrapped<T> {
  if (isWrapped(value)) return value
  return WrappedFulfilled.create(value)
}
