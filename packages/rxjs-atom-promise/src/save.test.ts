import { Atom } from "@rixio/rxjs-atom"
import { PromiseState, createPromiseStateIdle } from "./promise-state"
import { save } from "./save"

describe("save", () => {
	test("should save data to atom", async () => {
		expect.assertions(1)
		const state = Atom.create<PromiseState<ApiData[]>>(createPromiseStateIdle())

		await save(api.loadPage(0, 5), state)
		expect(state.get().value).toBeTruthy()
	})

	test("should save to separate atoms", async () => {
		expect.assertions(1)
		const state = Atom.create<PromiseState<ApiData[]>>(createPromiseStateIdle())

		await save(api.loadPage(0, 5), {
			value: state.lens("value"),
			status: state,
		})
		expect(state.get().value).toBeTruthy()
	})
})

export type ApiData = {
	id: string
	value: number
}

export const apiItems = new Array(100).fill(1).map(
	(_, index) =>
		({
			id: index.toString(),
			value: index,
		} as ApiData)
)

export type LoadPageContinuation = number

export const api = {
	loadPage: (page: LoadPageContinuation, perPage: number) =>
		Promise.resolve(apiItems.slice(page * perPage, page * perPage + perPage)),
}
