import { Atom } from "../../atom"
import { byIndexFactory } from "."

describe("byIndexFactory", () => {
	it("should read and write to lens", () => {
		const value$ = Atom.create(["hello"])
		const lensed$ = value$.lens(byIndexFactory(0, createDefaultValue))
		expect(lensed$.get()).toEqual("hello")
		lensed$.set("world")
		expect(lensed$.get()).toEqual("world")
		expect(value$.get()).toEqual(["world"])
	})

	it("should return default value when index not exist", () => {
		const value$ = Atom.create(["hello"])
		const lensed$ = value$.lens(byIndexFactory(1, createDefaultValue))
		expect(lensed$.get()).toEqual("defaultValue")
		expect(value$.get()).toEqual(["hello"])
		lensed$.set("world")
		expect(lensed$.get()).toEqual("world")
		expect(value$.get()).toEqual(["hello", "world"])
	})
})

function createDefaultValue() {
	return "defaultValue"
}
