import { Map as IM } from "immutable"
import { Atom } from "../../atom"
import { byKeyImmutableFactory } from "./index"

type UserId = string & {
	__IS_USER_ID__: true
}

type UserData = {
	id: UserId
	name: string
	surname: string
}

describe("byKeyImmutable", () => {
	it("should write new entry by key", async () => {
		const userFactory = byKeyImmutableFactory<UserId, UserData>(id => ({
			id,
			name: "John",
			surname: "Doe",
		}))
		const value$ = Atom.create<Record<UserId, UserData>>(IM())

		const userId = "user-1" as UserId
		const lensed$ = value$.lens(userFactory(userId))
		expect(lensed$.get()).toEqual({
			id: userId,
			name: "John",
			surname: "Doe",
		})
	})
})
