import React, { ReactElement } from "react"
import { act, render } from "@testing-library/react"
import { Atom } from "@grecha/rxjs-atom"
import { createLoadingStateLoading, createLoadingStateSuccess, LoadingState } from "./loading-state"
import { Loader } from "./loader"
import { R } from "@grecha/rxjs-react"

function testSuccess(comp: (state: Atom<LoadingState<number>>) => ReactElement) {
	const state$ = Atom.create(createLoadingStateLoading<number>())
	const r = render(comp(state$))
	expect(r.getByTestId("test")).toHaveTextContent("loading")
	const number = Math.random()
	act(() => {
		state$.set(createLoadingStateSuccess(number))
	})
	expect(r.getByTestId("test")).toHaveTextContent(number.toString())
}

describe("Loader", () => {
	test("should display loading if is loading", async () => {
		expect.assertions(2)
		const state$ = Atom.create(createLoadingStateLoading<string>())
		const r = render(
			<span data-testid="test">
				<Loader state$={state$} loading={<span>loading</span>}>{v => <span>{v}</span>}</Loader>
			</span>,
		)
		await expect(r.getByTestId("test")).toHaveTextContent("loading")
		await expect(r.getByTestId("test")).not.toHaveTextContent("content")
	})

	test("should display content if loaded", async () => {
		testSuccess(state$ =>
			<span data-testid="test">
				<Loader state$={state$} loading={<span>loading</span>}>
					{value => <span>{value}</span>}
				</Loader>
			</span>,
		)
	})

	test("should display content if children empty", async () => {
		testSuccess(state$ =>
			<span data-testid="test">
				<Loader state$={state$} loading={<span>loading</span>}/>
			</span>,
		)
	})

	test("should work if render prop is not used", () => {
		testSuccess(state$ =>
			<span data-testid="test">
				<Loader state$={state$} loading={<span>loading</span>}>
					simple text
					<div>multiple elements</div>
					<R.span>{state$.lens("value")}</R.span>
				</Loader>
			</span>,
		)
	})
})
