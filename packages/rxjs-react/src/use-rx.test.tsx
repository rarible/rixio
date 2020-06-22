import { Observable, of, ReplaySubject } from "rxjs"
import React from "react"
import { render } from "@testing-library/react"
import { Atom } from "@grecha/rxjs-atom"
import { act } from "react-dom/test-utils"
import { useRx } from "./use-rx"
import { delay, flatMap, map } from "rxjs/operators"

const RxText = ({ value, renders }: { value: Observable<string>, renders: Atom<number> }) => {
	const simple = useRx(value)
	renders.modify(x => x + 1)
	return <span data-testid="value">{simple}</span>
}

let count = 0
const Count = () => {
	count = count + 1
	return <span>test</span>
}
const TestCount = (props: { value: Observable<number> }) => {
	useRx(props.value)
	return <Count/>
}

describe("useRx", () => {
	test("should render atom exactly one time", () => {
		const text = Math.random().toString()
		const renders = Atom.create(0)
		const r = render(<RxText value={Atom.create(text)} renders={renders}/>)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		expect(renders.get()).toStrictEqual(1)
	})

	test("should render ReplaySubject 1 time", () => {
		const renders = Atom.create(0)
		const subject = new ReplaySubject<string>(1)
		const text = Math.random().toString()
		subject.next(text)
		const r = render(<RxText value={subject} renders={renders}/>)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		expect(renders.get()).toStrictEqual(1)
	})

	test("should listen to Atom changes", () => {
		testSimple(a => a)
	})

	test("should work with simple map operator", () => {
		testSimple(a => a.pipe(map(x => x)))
	})

	test("should work with simple flatMap operator", () => {
		testSimple(a => a.pipe(flatMap(x => of(x))))
	})

	test("should not work when there is no immediate value", () => {
		expect(() => {
			testSimple(a => a.pipe(delay(100)))
		}).toThrow()
	})

	function testSimple(preprocessor: (o: Observable<string>) => Observable<string>) {
		const renders = Atom.create(0)
		const text = Math.random().toString()
		const atom = Atom.create(text)
		const r = render(<RxText value={preprocessor(atom)} renders={renders}/>)
		expect(r.getByTestId("value")).toHaveTextContent(text)
		const nextText = Math.random().toString()
		act(() => atom.set(nextText))
		expect(r.getByTestId("value")).toHaveTextContent(nextText)
		expect(renders.get()).toStrictEqual(2)
	}

	test("should not trigger rerender if not changed", () => {
		const subject = new ReplaySubject<number>(1)
		subject.next(1)
		render(<TestCount value={subject}/>)
		expect(count).toBe(1)
		act(() => subject.next(1))
		expect(count).toBe(1)
	})
})
