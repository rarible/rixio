import React from "react"
import { act, render, fireEvent } from "@testing-library/react"
import { Observable, ReplaySubject, defer } from "rxjs"
import { Wrapped, createRejectedWrapped, createFulfilledWrapped } from "@rixio/rxjs-wrapped"
import waitForExpect from "wait-for-expect"
import { RxWrapper } from "./rx-wrapper"

type TestProps = { value1: string; value2: string }
const Test = ({ value1, value2 }: TestProps) => {
	return (
		<span data-testid="value">
			{value1} {value2}
		</span>
	)
}

const Testing = ({ text, reload }: { text?: any; reload?: () => void }) => {
	return (
		<>
			<span data-testid="testing">{text || "BLABLABLA"}</span>
			<button data-testid="reload" onClick={reload}>
				reload
			</button>
		</>
	)
}

describe("RxWrapper", () => {
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

	test("should not render anything if observable doesn't emit value", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		const r = render(<RxWrapper component={Test} value1={obs} value2="static" />)
		expect(() => r.getByTestId("value")).toThrow()
		act(() => obs.next(text))
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should render pending prop if observable doesn't emit value", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<string>(1)
		const r = render(<RxWrapper component={Test} value1={obs} value2="static" pending={<Testing />} />)
		expect(r.getByTestId("testing")).toHaveTextContent("BLABLABLA")
		expect(() => r.getByTestId("value")).toThrow()
		act(() => obs.next(text))
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => obs.next(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
	})

	test("should render rejected prop if observable emits error", () => {
		const text = Math.random().toString()
		const obs = new ReplaySubject<Wrapped<string>>(1)
		let reloaded = false
		const reload = () => {
			reloaded = true
		}
		const r = render(
			<RxWrapper<TestProps>
				component={Test}
				value1={obs}
				value2="static"
				rejected={(e, reload) => <Testing text={e} reload={reload} />}
			/>
		)
		act(() => obs.next(createRejectedWrapped(text, reload)))
		expect(r.getByTestId("testing")).toHaveTextContent(text)
		expect(() => r.getByTestId("value")).toThrow()
		expect(reloaded).toBeFalsy()
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		expect(reloaded).toBeTruthy()
		act(() => obs.next(createFulfilledWrapped(text)))
		expect(r.getByTestId("value")).toHaveTextContent(text)
	})

	test("should resubscribe failed observable", async () => {
		const text = Math.random().toString()
		let promise: Promise<string> = Promise.reject(text)
		const obs = defer(() => promise)

		const r = render(
			<RxWrapper<TestProps>
				component={Test}
				value1={obs}
				value2="static"
				rejected={(e, reload) => <Testing text={e} reload={reload} />}
			/>
		)
		await waitForExpect(() => {
			expect(r.getByTestId("testing")).toHaveTextContent(text)
		})
		expect(() => r.getByTestId("value")).toThrow()
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		expect(r.getByTestId("testing")).toHaveTextContent(text)
		const successText = Math.random().toString()
		promise = Promise.resolve(successText)
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		await waitForExpect(() => {
			expect(r.getByTestId("value")).toHaveTextContent(successText)
		})
	})

	test("should react to props changes", () => {
		const text = Math.random().toString()
		const r = render(<RxWrapper component={Test} value1="static" value2={text} />)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		r.rerender(<RxWrapper component={Test} value1="static" value2={nextText} />)
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
		const r = render(<RxWrapper component={Test} value1={obs} value2="some" />)
		expect(r.getByTestId("value")).toHaveTextContent(text)

		const nextText = Math.random().toString()
		const obs2 = new ReplaySubject<string>(1)
		obs2.next(nextText)
		expect(count).toBe(1)

		r.rerender(<RxWrapper component={Test} value1={obs2} value2="some" />)
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
		expect(count).toBe(0)
	})
})
