import { ReplaySubject, Observable, Subject } from "rxjs"
import { render, waitFor } from "@testing-library/react"
import { act } from "react-dom/test-utils"
import React from "react"
import { useWrappedRx } from "./use-wrapped-rx"
import { WrappedRx, wrap } from "./cache-state"

describe("useWrappedRx", () => {
	test("should work with plain observables", async () => {
		const subj = new ReplaySubject<number>(0)
		const Test = ({ value }: { value: Observable<number> }) => {
			const raw = useWrappedRx(value)
			switch (raw.status) {
				case "pending":
					return <>pending</>
				case "fulfilled":
					return <>{raw.value}</>
				default:
					return <>default</>
			}
		}

		const r = render(
			<span data-testid="test">
				<Test value={subj} />
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		const num = Math.random()
		act(() => subj.next(num))
		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent(num.toString())
		})
	})

	test("should work with wrapped observables", async () => {
		const subj = new ReplaySubject<WrappedRx<number>>(0)
		const Test = ({ value }: { value: Observable<WrappedRx<number>> }) => {
			const raw = useWrappedRx(value)
			switch (raw.status) {
				case "pending":
					return <>pending</>
				case "fulfilled":
					return <>{raw.value}</>
				default:
					return <>default</>
			}
		}

		const r = render(
			<span data-testid="test">
				<Test value={subj} />
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
		const num = Math.random()
		act(() => subj.next(wrap(num)))
		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent(num.toString())
		})
	})

	test("should work with emitted errors", async () => {
		const s = new Subject<number>()
		const Test = ({ value }: { value: Observable<number> }) => {
			const raw = useWrappedRx(value)
			return <>{raw.status}</>
		}
		const r = render(
			<span data-testid="test">
				<Test value={s} />
			</span>
		)
		act(() => s.error(new Error("thrown")))
		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent("rejected")
		})
	})
})
