import { Atom } from "@rixio/atom"
import type { CacheState } from "../../domain"
import { CacheIdle } from "../../domain"
import { save } from "."

describe("save", () => {
  it("should save value", async () => {
    const result: CacheState<number>["status"][] = []
    const data$ = Atom.create(CacheIdle.create())
    const sub = data$.subscribe(x => result.push(x.status))
    expect(result).toEqual(["idle"])
    const promise = save(new Promise(r => setTimeout(() => r(10), 16)), data$)
    await expect(promise).resolves.toEqual(10)
    expect(result.length).toEqual(3)
    expect(result).toEqual(["idle", "pending", "fulfilled"])
    sub.unsubscribe()
  })

  it("should throw error", async () => {
    const result: CacheState<number>["status"][] = []
    const data$ = Atom.create(CacheIdle.create())
    const sub = data$.subscribe(x => result.push(x.status))
    expect(result).toEqual(["idle"])
    const promise = save(new Promise((_, r) => setTimeout(() => r(10), 16)), data$)
    await expect(promise).rejects.toEqual(10)
    expect(result).toEqual(["idle", "pending", "rejected"])
    sub.unsubscribe()
  })

  it("should not put pending state when promise immediately resolved", async () => {
    const result: CacheState<number>["status"][] = []
    const data$ = Atom.create(CacheIdle.create())
    const sub = data$.subscribe(x => result.push(x.status))
    expect(result).toEqual(["idle"])
    const promise = save(Promise.resolve(10), data$)
    await expect(promise).resolves.toEqual(10)
    expect(result).toEqual(["idle", "fulfilled"])
    sub.unsubscribe()
  })

  it("result from save should be the same as promise's result", async () => {
    const data$ = Atom.create(CacheIdle.create())
    const originalPromise = new Promise(r => setTimeout(() => r(10), 16))
    const promise = save(originalPromise, data$)
    const originalResult = await originalPromise
    const promiseResult = await promise
    expect(originalResult).toEqual(promiseResult)
  })
})
