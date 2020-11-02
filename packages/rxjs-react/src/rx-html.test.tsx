/* eslint-disable react/jsx-pascal-case */
import { act, render } from "@testing-library/react"
import { ReplaySubject } from "rxjs"
import React from "react"
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
})
