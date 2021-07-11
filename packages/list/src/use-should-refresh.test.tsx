import React, { useMemo } from "react"
import { Atom } from "@rixio/atom"
import { RxIf } from "@rixio/react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { act } from "react-dom/test-utils"
import { InfiniteListState, ListPartLoader } from "./domain"
import { useShouldRefresh } from "./use-should-refresh"
import { InfiniteList } from "./infinite-list"

const mapId = (x?: string) => x
function CheckShouldRefresh({
	state$,
	loader,
}: {
	state$: Atom<InfiniteListState<string, string>>
	loader: ListPartLoader<string, string>
}) {
	const list$ = useMemo(() => new InfiniteList(state$, loader, 10), [loader, state$])
	const { shouldRefresh$, refreshing$, refresh } = useShouldRefresh(list$, mapId)
	return (
		<>
			<RxIf test$={shouldRefresh$}>
				<button data-testid="refresh" onClick={refresh}>
					refresh
				</button>
			</RxIf>
			<RxIf test$={refreshing$}>
				<span data-testid="refreshing">refreshing</span>
			</RxIf>
		</>
	)
}

describe("useShouldRefresh", () => {
	it("should be false, if list not changed", async () => {
		const state$ = Atom.create<InfiniteListState<string, string>>({
			items: ["1"],
			status: "fulfilled",
			continuation: "1",
			finished: false,
		})
		let loadCount = 0
		const loader: ListPartLoader<string, string> = () => {
			loadCount = loadCount + 1
			return Promise.resolve([["1"], "1"])
		}
		const r = render(<CheckShouldRefresh state$={state$} loader={loader} />)
		await delay(50)
		expect(loadCount).toEqual(1)
		expect(() => r.getByTestId("refresh")).toThrow()
		expect(() => r.getByTestId("refreshing")).toThrow()
	})

	it("should be true, if list changed", async () => {
		const state$ = Atom.create<InfiniteListState<string, string>>({
			items: ["1"],
			status: "fulfilled",
			continuation: "1",
			finished: false,
		})
		let loadCount = 0
		const loader: ListPartLoader<string, string> = c => {
			loadCount = loadCount + 1
			return Promise.resolve([["2"], "1"])
		}
		const r = render(<CheckShouldRefresh state$={state$} loader={loader} />)
		expect(loadCount).toEqual(1)
		await waitFor(() => {
			expect(() => r.getByTestId("refresh")).not.toThrow()
		})
		act(() => {
			fireEvent.click(r.getByTestId("refresh"))
		})
		await waitFor(() => {
			expect(() => r.getByTestId("refreshing")).not.toThrow()
		})
		expect(loadCount).toEqual(2)
		await waitFor(() => {
			expect(() => r.getByTestId("refresh")).toThrow()
			expect(() => r.getByTestId("refreshing")).toThrow()
		})
		expect(loadCount).toEqual(2)
	})
})

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
