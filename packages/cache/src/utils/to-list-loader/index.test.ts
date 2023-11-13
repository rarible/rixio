import { toListLoader } from "./index"

describe("toListLoader", () => {
  it("should resolve all values", async () => {
    const loader = toListLoader<string, string>(x => Promise.resolve(x + "1"), undefined)
    const result = await loader(["hello", "world"])
    expect(result).toStrictEqual([
      ["hello", "hello1"],
      ["world", "world1"],
    ])
  })

  it("should apply fallback when error", async () => {
    const err = new Error("My error")
    const loader = toListLoader<string, string>(
      x => {
        if (x === "hello") return Promise.reject(err)
        return Promise.resolve(x + "1")
      },
      () => "fallback",
    )
    const result = await loader(["hello", "world"])
    expect(result).toStrictEqual([
      ["hello", "fallback"],
      ["world", "world1"],
    ])
  })
})
