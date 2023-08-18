import { Atom } from "../../atom"
import { byKeyFactory } from "./index"

type UserId = string & {
  __IS_USER_ID__: true
}

type UserData = {
  id: UserId
  name: string
  surname: string
}

describe("byKey", () => {
  it("should write new entry by key", async () => {
    const userFactory = byKeyFactory<UserId, UserData>(id => ({
      id,
      name: "John",
      surname: "Doe",
    }))
    const value$ = Atom.create<Record<UserId, UserData>>({})

    const userId = "user-1" as UserId
    const lensed$ = value$.lens(userFactory(userId))
    expect(lensed$.get()).toEqual({
      id: userId,
      name: "John",
      surname: "Doe",
    })
  })
})
