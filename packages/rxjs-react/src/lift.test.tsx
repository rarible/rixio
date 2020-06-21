import { act, render } from "@testing-library/react"
import { ReplaySubject } from "rxjs"
import React from "react"
import { lift } from "./lift"

const LiftedDiv = lift(function Div({ value }: { value: string }) {
	return <div>{value}</div>
})

describe("lift", () => {
	test("should observe reactive value using lifted html", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		obs.next(text)
		const r = render(<span data-testid="value"><LiftedDiv value={obs}/></span>)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})
})
