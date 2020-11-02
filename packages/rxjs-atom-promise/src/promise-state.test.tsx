import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { Atom } from "@rixio/rxjs-atom"
import { flatMap, map } from "rxjs/operators"
import {
	createPromiseStatePending,
	createPromiseStateFulfilled,
	mapPromiseState,
	mapPromiseStateAsync,
} from "./promise-state"
import { Rx } from "./rx"

describe("Promise-state", () => {
	test("should map promise state", () => {
		const state$ = Atom.create(createPromiseStatePending<number>())
		const mappedState$ = state$.pipe(map(mapPromiseState(x => x + 1)))
		const r = render(
			<React.Fragment>
				<span data-testid="test">
					<Rx value$={state$} pending="pending">
						{v => <span>{v}</span>}
					</Rx>
				</span>
				<span data-testid="test-mapped">
					<Rx value$={mappedState$} pending="pending">
						{v => <span>{v}</span>}
					</Rx>
				</span>
			</React.Fragment>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		expect(r.getByTestId("test-mapped")).toHaveTextContent("pending")
		act(() => {
			state$.set(createPromiseStateFulfilled(1))
		})
		expect(r.getByTestId("test")).toHaveTextContent("1")
		expect(r.getByTestId("test-mapped")).toHaveTextContent("2")
	})

	test("should mergeMap promise state", async () => {
		const state$ = Atom.create(createPromiseStatePending<number>())
		const mappedState$ = state$.pipe(flatMap(mapPromiseStateAsync(x => Promise.resolve(x + 1))))
		const r = render(
			<React.Fragment>
				<span data-testid="test">
					<Rx value$={state$} pending="pending">
						{v => <span>{v}</span>}
					</Rx>
				</span>
				<span data-testid="test-mapped">
					<Rx value$={mappedState$} pending="pending">
						{v => <span>{v}</span>}
					</Rx>
				</span>
			</React.Fragment>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		expect(r.getByTestId("test-mapped")).toHaveTextContent("pending")
		act(() => {
			state$.set(createPromiseStateFulfilled(1))
		})
		expect(r.getByTestId("test")).toHaveTextContent("1")
		await waitFor(() => {
			expect(r.getByTestId("test-mapped")).toHaveTextContent("2")
		})
	})
})
