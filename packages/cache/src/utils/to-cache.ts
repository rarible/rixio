import type { Wrapped } from "@rixio/wrapped"
import { WrappedFulfilled, WrappedRejected, WrappedPending } from "@rixio/wrapped"
import type { CacheState } from "../domain"
import { CacheFulfilled, CachePending, CacheRejected } from "../domain"

export function toCache<T>(wrapped: Wrapped<T>): CacheState<T> {
  switch (wrapped.status) {
    case "fulfilled":
      return CacheFulfilled.create(wrapped.value)
    case "pending":
      return CachePending.create()
    case "rejected":
      return CacheRejected.create(wrapped.error)
    default:
      throw new Error("Unknown Wrapped state")
  }
}

export function fromCache<T>(cache: CacheState<T>): Wrapped<T> {
  switch (cache.status) {
    case "fulfilled":
      return WrappedFulfilled.create(cache.value)
    case "idle":
    case "pending":
      return WrappedPending.create()
    case "rejected":
      return WrappedRejected.create(cache.error)
    default:
      throw new Error("Unknown Cache state")
  }
}
