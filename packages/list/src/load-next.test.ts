import { Atom } from "@rixio/rxjs-atom"
import { api, ApiData, LoadPageContinuation } from "../test/fixtures/api"
import { InfiniteListState, ListPartLoader, listStateIdle } from "./domain"
import { loadNext } from "./load-next"

type MyListState = InfiniteListState<ApiData, LoadPageContinuation>

let appState: Atom<MyListState>

describe("load-next", () => {
	beforeEach(() => {
		appState = Atom.create(listStateIdle())
	})

	test("Should create new load next function", async () => {
		expect.assertions(4)
		const loader: ListPartLoader<ApiData, LoadPageContinuation> = async continuation => {
			const page = continuation || 0
			const nextItems = await api.loadPage(page, 10)
			return [nextItems, page + 1]
		}
		expect(appState.get()).toEqual(listStateIdle())

		await loadNext(appState, loader)
		const firstPage = await api.loadPage(0, 10)

		expect(appState.get().status).toEqual("fulfilled")
		expect(appState.get().continuation).toEqual(1)
		expect(appState.get().items).toEqual(firstPage)
	})

	test("Should fail request", async () => {
		expect.assertions(4)
		const ERROR_MESSAGE = "error"

		const loader: ListPartLoader<ApiData, LoadPageContinuation> = async () => {
			throw ERROR_MESSAGE
		}

		await loadNext(appState, loader)

		const state = appState.get()
		expect(state.status).toEqual("rejected")
		// @ts-ignore
		expect(state.error).toEqual(ERROR_MESSAGE)
		expect(state.items).toEqual([])
		expect(state.continuation).toEqual(null)
	})
})
