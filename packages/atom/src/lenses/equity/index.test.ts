import { Atom } from "../../index"
import { equityLensFactory } from "."

describe("equityLensFactory", () => {
	it("should return true", () => {
		const factory = equityLensFactory<string>()
		const value$ = Atom.create("test")
		const lensed$ = value$.lens(factory("test"))
		expect(lensed$.get()).toEqual(true)
	})

	it("should return false", () => {
		const factory = equityLensFactory<string>()
		const value$ = Atom.create("test")
		const lensed$ = value$.lens(factory("test1"))
		expect(lensed$.get()).toEqual(false)
	})
})
