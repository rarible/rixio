import { Atom } from "@rixio/rxjs-atom"
import { InfiniteListState, ListPartLoader } from "./domain"

export async function loadNext<T, C>(state$: Atom<InfiniteListState<T, C>>, partLoader: ListPartLoader<T, C>) {
	const status$ = state$.lens("status")

	if (status$.get() === "pending") {
		console.warn("List is updating")
		return
	} else if (state$.get().finished) {
		console.warn("Loadable list already finished")
		return
	}

	const promise = partLoader(state$.get().continuation)
	status$.set("pending")
	try {
		const [items, continuation] = await promise
		const finished = items.length === 0 || continuation === null
		state$.modify(state => ({
			...state,
			finished,
			items: state.items.concat(items),
			continuation,
			status: "fulfilled",
		}))
	} catch (error) {
		state$.modify(state => ({
			...state,
			status: "rejected",
			error,
		}))
	}
}
