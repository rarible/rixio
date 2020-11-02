/* eslint-disable react/jsx-pascal-case */
import React, { ReactElement } from "react"
import { act, render, waitFor } from "@testing-library/react"
import { Atom } from "@rixio/rxjs-atom"
import { R } from "@rixio/rxjs-react"
import { ReplaySubject } from "rxjs"
import { PromiseState, createPromiseStatePending, createPromiseStateFulfilled } from "./promise-state"
import { Rx } from "./rx"

describe("Rx", () => {
	test("should display pending if is pending", () => {
		const state$ = Atom.create(createPromiseStatePending<string>())
		const r = render(
			<span data-testid="test">
				<Rx value$={state$} pending="pending">
					{v => <span>{v}</span>}
				</Rx>
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		expect(r.getByTestId("test")).not.toHaveTextContent("content")
	})

	test("should not display pending if handlePending=none", () => {
		const state$ = Atom.create(createPromiseStatePending<string>())
		const r = render(
			<span data-testid="test">
				<Rx value$={state$} pending="pending" handlePending="none">
					{v => <span>{v}</span>}
				</Rx>
			</span>
		)
		expect(r.getByTestId("test")).not.toHaveTextContent("pending")
		act(() => state$.set(createPromiseStateFulfilled("content")))
		expect(r.getByTestId("test")).toHaveTextContent("content")
	})

	test("should display pending only first time when handlePending=initial", () => {
		const state$ = Atom.create(createPromiseStatePending<string>())
		const r = render(
			<span data-testid="test">
				<Rx value$={state$} pending="pending" handlePending="initial">
					{v => <span>{v}</span>}
				</Rx>
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		act(() => state$.set(createPromiseStateFulfilled("content")))
		expect(r.getByTestId("test")).toHaveTextContent("content")
		act(() => state$.lens("status").set("pending"))
		expect(r.getByTestId("test")).not.toHaveTextContent("pending")
	})

	test("should display content if loaded", () => {
		return testPromiseState(state$ => (
			<span data-testid="test">
				<Rx value$={state$} pending="pending">
					{value => <span>{value}</span>}
				</Rx>
			</span>
		))
	})

	test("should display content if simple observable is used", () => {
		const subj = new ReplaySubject<number>(1)
		const r = render(
			<span data-testid="test">
				<Rx value$={subj} pending="pending" />
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		const number = Math.random()
		act(() => {
			subj.next(number)
		})
		return waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent(number.toString())
		})
	})

	test("should display error if simple observable is used", () => {
		const subj = new ReplaySubject<number>(1)
		const r = render(
			<span data-testid="test">
				<Rx value$={subj} pending="pending" rejected={x => x} />
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		const text = Math.random().toString()
		act(() => {
			try {
				subj.error(text)
			} catch (_) {}
		})
		return waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent(text)
		})
	})

	test("should display content if children empty", () => {
		return testPromiseState(state$ => (
			<span data-testid="test">
				<Rx value$={state$} pending="pending" />
			</span>
		))
	})

	test("should work if render prop is not used", () => {
		return testPromiseState(state$ => (
			<span data-testid="test">
				<Rx value$={state$} pending="pending">
					simple text
					<div>multiple elements</div>
					<R.span>{state$.lens("value")}</R.span>
				</Rx>
			</span>
		))
	})

	test("should work with null atom's value", () => {
		const state$ = Atom.create(null)
		const r = render(
			<span data-testid="test">
				<Rx value$={state$}>{v => <span>{`${v}`}</span>}</Rx>
			</span>
		)
		return expect(r.getByTestId("test")).toHaveTextContent("null")
	})
})

function testPromiseState(comp: (state: Atom<PromiseState<number>>) => ReactElement) {
	const state$ = Atom.create(createPromiseStatePending<number>())
	const r = render(comp(state$))
	expect(r.getByTestId("test")).toHaveTextContent("pending")
	const number = Math.random()
	act(() => {
		state$.set(createPromiseStateFulfilled(number))
	})
	return waitFor(() => {
		expect(r.getByTestId("test")).toHaveTextContent(number.toString())
	})
}
