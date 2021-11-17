import React, { ReactElement } from "react"
import { act, render, waitFor, fireEvent } from "@testing-library/react"
import { Atom } from "@rixio/atom"
import { R } from "@rixio/react"
import { BehaviorSubject, Observable, ReplaySubject, defer, Subject } from "rxjs"
import { createFulfilledWrapped, pendingWrapped, Wrapped } from "@rixio/wrapped"
import { CacheImpl, createFulfilledCache, idleCache, KeyCacheImpl, KeyMemoImpl } from "@rixio/cache"
import { MemoImpl } from "@rixio/cache"
import { Map as IM } from "immutable"
import { toListDataLoader } from "@rixio/cache"
import waitForExpect from "wait-for-expect"
import { Rx } from "./rx"

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

describe("Rx", () => {

	test.only("Rx should work with Memo and reload", async () => {
		let counter = 0
		const cache = new MemoImpl<string>(Atom.create(idleCache), async () => {
			counter = counter + 1
			if (counter <= 1) {
				throw "my-error"
			} else {
				return "resolved"
			}
		})
		const r = render(
			<span data-testid="test">
				<Rx
					value$={cache}
					pending="pending"
					rejected={(err, reload) => <Testing text={err} reload={reload} />}
				/>
			</span>
		)
		await waitFor(() => {
			expect(r.getByTestId("reload")).toBeInTheDocument()
		})
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		await waitForExpect(() => {
			expect(r.getByTestId("test")).toHaveTextContent("resolved")
		}, 2000)
	})

})

function testCacheState(comp: (state: Observable<Wrapped<number>>) => ReactElement) {
	const state$ = new BehaviorSubject<Wrapped<number>>(pendingWrapped)
	const r = render(comp(state$))
	expect(r.getByTestId("test")).toHaveTextContent("pending")
	const number = Math.random()
	act(() => {
		state$.next(createFulfilledWrapped(number))
	})
	expect(r.getByTestId("test")).toHaveTextContent(number.toString())
}
