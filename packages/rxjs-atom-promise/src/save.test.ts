import { Atom } from "@rixio/rxjs-atom"
import { api, ApiData } from "../test/fixtures/api"
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
