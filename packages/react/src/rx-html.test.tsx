/* eslint-disable react/jsx-pascal-case */
import { act, render } from "@testing-library/react"
import { of, ReplaySubject } from "rxjs"
import React from "react"
import { createFulfilledWrapped } from "@rixio/wrapped"
import { R } from "./rx-html"

describe("RxHtml", () => {
	test("should observe reactive value using lifted html", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		obs.next(text)
		const r = render(
			<span data-testid="value">
				<R.div>{obs}</R.div>
			</span>
		)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should observe wrapped reactive value using lifted html", () => {
		const text = Math.random().toString()
		const r = render(
			<span data-testid="value">
				<R.div>{of(createFulfilledWrapped(text))}</R.div>
			</span>
		)
		expect(r.getByTestId("value")).toHaveTextContent(text)
	})

	test("should support some observables in children", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		obs.next(text)
		const r = render(
			<span data-testid="value">
				<R.div>
					{obs}-test-{obs}
				</R.div>
			</span>
		)
		expect(r.getByTestId("value")).toHaveTextContent(`${text}-test-${text}`)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(`${nextText}-test-${nextText}`)
	})

	test("should not display anything if observable doesn't emit value", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		const r = render(
			<span data-testid="value">
				<R.div>{obs}</R.div>
			</span>
		)
		expect(r.getByTestId("value")).toBeEmpty()
		obs.next(text)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})
})
