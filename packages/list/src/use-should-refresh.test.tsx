import React from "react"
import { Atom } from "@rixio/atom"
import { RxIf } from "@rixio/react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { act } from "react-dom/test-utils"
import { InfiniteListState, ListPartLoader } from "./domain"
import { useShouldRefresh } from "./use-should-refresh"

function CheckShouldRefresh({
	state$,
	loader,
}: {
	state$: Atom<InfiniteListState<string, string>>
	loader: ListPartLoader<string, string>
}) {
	const { shouldRefresh$, refreshing$, refresh } = useShouldRefresh({ state$, loader })
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
		const state$ = Atom.create<InfiniteListState<string, string>>({ items: ["1"], status: "fulfilled", continuation: "1", finished: true })
		const loader: ListPartLoader<string, string> = c => Promise.resolve([["1"], "1"])
		const r = render(<CheckShouldRefresh state$={state$} loader={loader}/>)
		await delay(50)
		expect(() => r.getByTestId("refresh")).toThrow()
		expect(() => r.getByTestId("refreshing")).toThrow()
	})

	it("should be true, if list changed", async () => {
		const state$ = Atom.create<InfiniteListState<string, string>>({ items: ["1"], status: "fulfilled", continuation: "1", finished: true })
		const loader: ListPartLoader<string, string> = c => Promise.resolve([["2"], "1"])
		const r = render(<CheckShouldRefresh state$={state$} loader={loader}/>)
		await waitFor(() => {
			expect(() => r.getByTestId("refresh")).not.toThrow()
		})
		act(() => {
			fireEvent.click(r.getByTestId("refresh"))
		})
		await waitFor(() => {
			expect(() => r.getByTestId("refreshing")).not.toThrow()
		})
		await waitFor(() => {
			expect(() => r.getByTestId("refresh")).toThrow()
			expect(() => r.getByTestId("refreshing")).toThrow()
		})
	})
})

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
