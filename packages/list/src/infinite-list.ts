import {
	createFulfilledWrapped,
	createRejectedWrapped,
	markWrappedObservable,
	pendingWrapped,
	Wrapped,
} from "@rixio/wrapped"
import { Atom } from "@rixio/atom"
import { MappedSubject } from "@rixio/cache/build/mapped-subject"
import { InfiniteListState, ListPartLoader, listStateIdle } from "./domain"

export type InfiniteListMapper<T, C, R> = (state: InfiniteListState<T, C>, list$: InfiniteList<T, C, any>) => Wrapped<R>

export class InfiniteList<T, C, R> extends MappedSubject<InfiniteListState<T, C>, Wrapped<R>> {
	constructor(
		readonly state$: Atom<InfiniteListState<T, C>>,
		readonly loader: ListPartLoader<T, C>,
		readonly pageSize: number,
		private readonly mapper: InfiniteListMapper<T, C, R>
	) {
		super(state$, undefined!)
		markWrappedObservable(this)
	}

	clear(): void {
		this.state$.set(listStateIdle)
	}

	loadPage(continuation: C | null): Promise<[T[], C | null]> {
		return this.loader(this.pageSize, continuation)
	}

	loadNext(force: boolean = false): Promise<void> {
		const { status, finished } = this.state$.get()
		if ((force || status === "fulfilled") && !finished) {
			return this.loadNextInternal()
		} else {
			return Promise.resolve()
		}
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
					return pendingWrapped
				} else if (state.status === "rejected") {
					return createRejectedWrapped(state.error, () => list$.loadNext(true))
				}
			}
		}
		switch (state.status) {
			case "idle":
			case "pending":
				return createFulfilledWrapped([...createRealListItems(state.items), ...createPendingPage(pendingPageSize, list$)])
			case "rejected":
				return createFulfilledWrapped([...createRealListItems(state.items), createRejectedItem(state.error, () => list$.loadNext(true))])
		}
		if (state.finished) {
			return createFulfilledWrapped([...createRealListItems(state.items)])
		} else {
			return createFulfilledWrapped([...createRealListItems(state.items), ...createPendingPage(pendingPageSize, list$)])
		}
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

function createPendingPage(pageSize: number, list: InfiniteList<any, any, any>) {
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
