import React from "react"
import { act, render } from "@testing-library/react"
import { Observable, ReplaySubject } from "rxjs"
import { RxWrapper } from "./rx-wrapper"

type TestProps = { value1: string, value2: string }
const Test = ({ value1, value2 }: TestProps) => {
	return <span data-testid="value">{value1} {value2}</span>
}

describe("Rx", () => {
	test("should observe reactive value", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		obs.next(text)
		const r = render(<RxWrapper component={Test} value1={obs} value2="static" />)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should react to props changes", () => {
		const text = Math.random().toString()
		const r = render(<RxWrapper component={Test} value1="static" value2={text}/>)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		r.rerender(<RxWrapper component={Test} value1="static" value2={nextText}/>)
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should resubscribe if observable changes", () => {
		const text = Math.random().toString()
		let count = 0
		const obs = new Observable<string>(s => {
			count = count + 1
			s.next(text)
			return () => {
				count = count - 1
			}
		})
		const r = render(<RxWrapper component={Test} value1={obs} value2="some"/>)
		expect(r.getByTestId("value")).toHaveTextContent(text)

		const nextText = Math.random().toString()
		const obs2 = new ReplaySubject<string>(1)
		obs2.next(nextText)
		expect(count).toBe(1)

		r.rerender(<RxWrapper component={Test} value1={obs2} value2="some"/>)
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
		expect(count).toBe(0)
	})

})
