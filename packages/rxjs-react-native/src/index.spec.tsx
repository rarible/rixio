import React from "react"
import { act, render } from "react-native-testing-library"
import { Atom } from "@grecha/rxjs-atom"
import { RxText } from "./index"

describe("RxText", () => {
	test("should render reactive test and observe changes", () => {
		const atom = Atom.create("initial")
		const r = render(<RxText testID="text">{atom}</RxText>)
		expect(r.getByTestId("text").props.children).toBe("initial")
		act(() => atom.set("new value"))
		expect(r.getByTestId("text").props.children).toBe("new value")
	})
})
