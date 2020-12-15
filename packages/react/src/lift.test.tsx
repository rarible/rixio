import { act, render } from "@testing-library/react"
import { ReplaySubject } from "rxjs"
import React from "react"
import { lift } from "./lift"

function Div({ value }: { value: string }) {
	return <div>{value}</div>
}

const LiftedDiv = lift(Div)
const ExtendedLiftedDiv = lift(Div, {
	pending: "BLABLABLA",
})

describe("lift", () => {
	test("should observe reactive value using lifted html", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		obs.next(text)
		const r = render(
			<span data-testid="value">
				<LiftedDiv value={obs} />
			</span>
		)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should render nothing if observable doesn't emit value immediately", () => {
		const obs = new ReplaySubject<string>(1)
		const r = render(
			<span data-testid="value">
				<LiftedDiv value={obs} />
			</span>
		)
		expect(r.getByTestId("value")).toBeEmpty()
		const text = Math.random().toString()
		obs.next(text)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should render pending props if observable doesn't emit value", () => {
		const obs = new ReplaySubject<string>(1)
		const r = render(
			<span data-testid="value">
				<ExtendedLiftedDiv value={obs} />
			</span>
		)
		expect(r.getByTestId("value")).toHaveTextContent("BLABLABLA")
		const text = Math.random().toString()
		obs.next(text)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})
})
