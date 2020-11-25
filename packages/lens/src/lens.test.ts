import { structEq } from "./utils"
import { Lens } from "./index"

function roundtrip<T, U>(name: string, l: Lens<T, U>, obj: T, oldVal: U, newVal: U) {
	describe(`lens roundtrip: ${name}`, () => {
		it("get", () => expect(l.get(obj)).toEqual(oldVal))
		it("set", () => expect(l.get(l.set(newVal, obj))).toEqual(newVal))
	})
}

// tslint:disable-next-line
// see https://www.schoolofhaskell.com/school/to-infinity-and-beyond/pick-of-the-week/a-little-lens-starter-tutorial#the-lens-laws-
function testLaws<T, U>(l: Lens<T, U>, object: T, value1: U, value2: U, name: string) {
	describe(`lens laws: ${name}`, () => {
		it("get-put", () => expect(structEq(object, l.set(l.get(object), object))).toBeTruthy())
		it("put-get", () => expect(structEq(value1, l.get(l.set(value1, object)))).toBeTruthy())
		it("put-put", () => expect(structEq(l.set(value2, l.set(value1, object)), l.set(value2, object))).toBeTruthy())
	})
}

function testLens<O, P>(name: string, l: Lens<O, P>, obj: O, currentValue: P, newValue1: P, newValue2: P) {
	testLaws(l, obj, newValue1, newValue2, name)
	roundtrip(name, l, obj, currentValue, newValue1)
}

describe("identity", () => {
	testLens("basic", Lens.identity<any>(), "any", "any", "other", "another")

	testLens("composed", Lens.identity<any>(), "any", "any", "other", "another")
})

describe("json", () => {
	describe("key lenses are cached", () => {
		const a1 = Lens.key("a")
		const a2 = Lens.key("a")
		const a3 = Lens.key()("a")
		const b = Lens.key("b")
		expect(a1).toStrictEqual(a2)
		expect(a2).toStrictEqual(a3)
		expect(a1).not.toStrictEqual(b)
	})

	describe("index lenses are cached", () => {
		const a1 = Lens.index(0)
		const a2 = Lens.index(0)
		const a3 = Lens.index(1)
		expect(a1).toStrictEqual(a2)
		expect(a2).not.toStrictEqual(a3)
	})

	describe("simple", () => {
		const a = Lens.key("a")
		const b = Lens.key("b")
		const c = Lens.key("c")
		const i0 = Lens.index(0)
		const i1 = Lens.index(1)

		testLens("keys", a, { a: "one" }, "one", "two", "three")

		testLens("indices", i0, ["one"], "one", "two", "three")

		testLens(
			"composed",
			a.compose(i0).compose(b).compose(i1).compose(c),
			{ a: [{ b: ["boo", { c: "one" }] }] },
			"one",
			"two",
			"three"
		)

		testLens(
			"composed, right associative",
			a.compose(i0.compose(b.compose(i1.compose(c)))),
			{ a: [{ b: ["boo", { c: "one" }] }] },
			"one",
			"two",
			"three"
		)

		testLens(
			"composed with Lens.compose",
			Lens.compose(a, i0, b, i1, c),
			{ a: [{ b: ["boo", { c: "one" }] }] },
			"one",
			"two",
			"three"
		)
	})

	describe("typed", () => {
		interface Leg {
			length: string
		}
		interface Raccoon {
			legs: Leg[]
		}
		interface Forest {
			raccoons: Raccoon[]
		}

		const forest: Forest = {
			raccoons: [
				{ legs: [{ length: "short" }, { length: "long" }] },
				{ legs: [{ length: "fat" }, { length: "thick" }] },
			],
		}

		const raccoons = Lens.key<Forest>()("raccoons")
		const legs = Lens.key<Raccoon>()("legs")
		const length = Lens.key<Leg>()("length")

		testLens(
			"case 1",
			raccoons.compose(Lens.index<Raccoon>(0)).compose(legs).compose(Lens.index<Leg>(0)).compose(length),
			forest,
			"short",
			"bold",
			"cursive"
		)

		testLens(
			"case 2",
			raccoons.compose(Lens.index<Raccoon>(1)).compose(legs).compose(Lens.index<Leg>(1)).compose(length),
			forest,
			"thick",
			"broken",
			"beautiful"
		)

		testLens(
			"compose",
			Lens.compose(raccoons, Lens.index(0), legs, Lens.index(1), length),
			forest,
			"long",
			"metal",
			"deus ex"
		)
	})

	describe("find", () => {
		const xs = [1, 2, 3, 4, 5]
		const l = Lens.find((x: number) => x === 3)

		const oldVal = 3
		const newVal = 5

		it("get", () => expect(l.get(xs)).toEqual(oldVal))
		it("set", () => expect(l.get(l.set(newVal, xs))).toEqual(undefined))
	})

	describe("withDefault", () => {
		const s = { a: 5, b: 6 } // c is undefined
		const l1 = Lens.key<number>("a").compose(Lens.withDefault(666))
		const l2 = Lens.key<number>("c").compose(Lens.withDefault(666))

		it("get defined", () => expect(l1.get(s)).toEqual(5))
		it("set defined", () => expect(l1.set(6, s)).toEqual({ a: 6, b: 6 }))
		it("get undefined", () => expect(l2.get(s)).toEqual(666))
		it("set undefined", () => expect(l2.set(6, s)).toEqual({ a: 5, b: 6, c: 6 }))
	})

	describe("withDefault transforms Prism into Lens", () => {
		const s = { a: 5, b: 6 } // c is undefined
		const l1 = Lens.key<number>("a").compose(Lens.withDefault(666))
		const l2 = Lens.key<number>("c").compose(Lens.withDefault(666))

		// the lines below should compile
		let _: number = l1.get(s)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_ = l2.get(s)
	})

	describe("type safe key", () => {
		const s = { a: 5, b: "6" }

		testLens<typeof s, typeof s["a"]>("type safe key 1", Lens.key<typeof s>()("a"), s, 5, 6, 7)

		testLens<typeof s, typeof s["b"]>("type safe key 2", Lens.key<typeof s>()("b"), s, "6", "7", "hello")
	})
})
