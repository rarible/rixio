import type { Wrapped } from "@rixio/wrapped"
import { WrappedFulfilled, WrappedPending, WrappedRejected } from "@rixio/wrapped"
import type { Atom } from "@rixio/atom"
import type { InfiniteListState, ListPartLoader } from "./domain"
import { listStateIdle } from "./domain"
import { MappedSubject } from "./utils"

export type InfiniteListMapper<T, C, R> = (
  state: InfiniteListState<T, C>,
  list$: BaseInfiniteList<T, C, any>,
) => Wrapped<R>

export class BaseInfiniteList<T, C, R> extends MappedSubject<InfiniteListState<T, C>, Wrapped<R>> {
  constructor(
    readonly state$: Atom<InfiniteListState<T, C>>,
    readonly loader: ListPartLoader<T, C>,
    readonly pageSize: number,
    private readonly mapper: InfiniteListMapper<T, C, R>,
  ) {
    super(state$, WrappedPending.create())
  }

  clear = (): void => this.state$.set(listStateIdle)
  loadPage = (continuation: C | null): Promise<[T[], C | null]> => this.loader(this.pageSize, continuation)

  loadNext = (force = false): Promise<void> => {
    const { status, finished } = this.state$.get()
    if ((force || status === "fulfilled") && !finished) {
      return this.loadNextInternal()
    }
    return Promise.resolve()
  }

  protected _onValue(source: InfiniteListState<T, C>): void {
    if (source.status === "idle") {
      this.loadNextInternal().then()
    }
    this.next(this.mapper(source, this))
  }

  private async loadNextInternal(): Promise<void> {
    const status$ = this.state$.lens("status")

    if (status$.get() === "pending") {
      console.warn("List is updating")
      return
    } else if (this.state$.get().finished) {
      console.warn("Loadable list already finished")
      return
    }

    const promise = this.loader(this.pageSize, this.state$.get().continuation)
    status$.set("pending")
    try {
      const [items, continuation] = await promise
      const finished = items.length === 0 || continuation === null
      this.state$.modify(state => ({
        ...state,
        finished,
        items: state.items.concat(items),
        continuation,
        status: "fulfilled",
      }))
    } catch (error) {
      this.state$.modify(state => ({
        ...state,
        status: "rejected",
        error,
      }))
    }
  }
}

export class InfiniteList<T, C> extends BaseInfiniteList<T, C, ListItem<T>[]> {
  constructor(
    state$: Atom<InfiniteListState<T, C>>,
    loader: ListPartLoader<T, C>,
    pageSize: number,
    props?: MapperFactoryProps,
  ) {
    super(state$, loader, pageSize, mapperFactory(props))
  }
}

const fakeItem = "fake_item"
const symbol = Symbol.for(fakeItem)
type PendingItem = {
  type: "pending"
  loadNext: () => Promise<void>
}
type RejectedItem = {
  type: "rejected"
  error: any
  reload: () => Promise<void>
}
export type FakeItem = {
  [fakeItem]: typeof symbol
} & (PendingItem | RejectedItem)

export type RealListItem<T> = {
  type: "item"
  value: T
}
export type ListItem<T> = RealListItem<T> | FakeItem

export type MapperFactoryProps = {
  pendingPageSize?: number
  initial?: "wrapped" | "fake"
}

export function mapperFactory<T, C>(props?: MapperFactoryProps): InfiniteListMapper<T, C, ListItem<T>[]> {
  return (state, list$) => {
    const pendingPageSize = props?.pendingPageSize === undefined ? list$.pageSize : props?.pendingPageSize
    const initial = props?.initial || "wrapped"

    if (initial === "wrapped") {
      if (state.continuation === null && !state.finished) {
        if (state.status === "idle" || state.status === "pending") {
          return WrappedPending.create()
        } else if (state.status === "rejected") {
          return WrappedRejected.create(state.error, () => list$.loadNext(true))
        }
      }
    }
    if (state.status === "rejected") {
      return WrappedFulfilled.create([
        ...createRealListItems(state.items),
        createRejectedItem(state.error, () => list$.loadNext(true)),
      ])
    }
    if (state.finished) {
      return WrappedFulfilled.create(createRealListItems(state.items))
    }
    return WrappedFulfilled.create(createRealListItems(state.items).concat(createPendingPage(pendingPageSize, list$)))
  }
}

function createRealListItems<T>(values: T[]) {
  return values.map(createRealListItem)
}

function createRealListItem<T>(value: T): RealListItem<T> {
  return {
    type: "item",
    value,
  }
}

function createPendingPage(pageSize: number, list: BaseInfiniteList<any, any, any>) {
  const pendingItem = createPendingItem(() => list.loadNext())
  return new Array(pageSize).fill(pendingItem)
}

function createRejectedItem(error: any, reload: () => Promise<void>): FakeItem {
  return {
    [fakeItem]: symbol,
    type: "rejected",
    error,
    reload,
  }
}

export function isFakeItem(object: any): boolean {
  return typeof object === "object" && object[fakeItem] === symbol
}

function createPendingItem(loadNext: () => Promise<void>): FakeItem {
  return {
    [fakeItem]: symbol,
    type: "pending",
    loadNext,
  }
}
