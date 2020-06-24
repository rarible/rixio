import React from "react"
import { render } from "@testing-library/react"
import { Atom } from "@rixio/rxjs-atom"
import { act } from "react-dom/test-utils"
import { RxIf } from "./rx-if"

let counter = 0

function Count() {
	counter = counter + 1
	return <span data-testid="value">text</span>
}

function Test({value}: {value: string}) {
	return <span data-testid="value">{value}</span>
}

describe("RxIf", () => {
	test("children are not rendered if test is not true", async () => {
		expect.assertions(3)
		const bool = Atom.create<boolean>(false)
		const r = render(<RxIf test$={bool}><Count/></RxIf>)
		expect(() => r.getByTestId("value")).toThrow()
		expect(counter).toBe(0)
		act(() => bool.set(true))
		r.getByTestId("value")
		expect(counter).toBe(1)
	})

	test("should render children if truthy", async () => {
		expect.assertions(1)
		const bool = Atom.create<string>("value")
		const r = render(<RxIf test$={bool}><span data-testid="value">test string</span></RxIf>)
		r.getByTestId("value")
		act(() => bool.set(""))
		expect(() => r.getByTestId("value")).toThrow()
	})

	test("should render children if true", async () => {
		expect.assertions(1)
		const bool = Atom.create<boolean>(true)
		const r = render(<RxIf test$={bool}><span data-testid="value">test string</span></RxIf>)
		r.getByTestId("value")
		act(() => bool.set(false))
		expect(() => r.getByTestId("value")).toThrow()
	})

	test("should work with negate", async () => {
		expect.assertions(1)
		const bool = Atom.create<boolean>(false)
		const r = render(<RxIf test$={bool} negate><span data-testid="value">test string</span></RxIf>)
		r.getByTestId("value")
		act(() => bool.set(true))
		expect(() => r.getByTestId("value")).toThrow()
	})

	test("should render else part if not true", () => {
		const bool = Atom.create<boolean>(true)
		const r = render(<RxIf test$={bool} else={() => <Test value="false"/>}><Test value="true"/></RxIf>)
		expect(r.getByTestId("value")).toHaveTextContent("true")
		act(() => bool.set(false))
		expect(r.getByTestId("value")).toHaveTextContent("false")
	})

})
