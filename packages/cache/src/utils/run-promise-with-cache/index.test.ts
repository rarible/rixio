import { Atom } from "@rixio/atom"
import type { CacheState } from "../../domain"
import { CacheIdle } from "../../domain"
import { runPromiseWithCache } from "."

describe("runPromiseWithCache", () => {
  jest.useFakeTimers()

  it("should run promise with cache", async () => {
    const loader = () => new Promise<void>(r => setTimeout(r, 16))
    const atom$ = Atom.create(CacheIdle.create())
    const values: CacheState<any>["status"][] = []
    const sub = atom$.subscribe(x => values.push(x.status))
    runPromiseWithCache(loader(), atom$)
    await jest.runAllTimersAsync()
    expect(values).toEqual(["idle", "pending", "fulfilled"])
    sub.unsubscribe()
  })

  it("should set rejected cache", async () => {
    const loader = () => new Promise<void>((_, r) => setTimeout(r, 16))
    const atom$ = Atom.create(CacheIdle.create())
    const values: CacheState<any>["status"][] = []
    const sub = atom$.subscribe(x => values.push(x.status))
    runPromiseWithCache(loader(), atom$)
    await jest.runAllTimersAsync()
    expect(values).toEqual(["idle", "pending", "rejected"])
    sub.unsubscribe()
  })

  it("shouldn't set pending when promise already resolved", async () => {
    const loader = () => Promise.resolve()
    const atom$ = Atom.create(CacheIdle.create())
    const values: CacheState<any>["status"][] = []
    const sub = atom$.subscribe(x => values.push(x.status))
    runPromiseWithCache(loader(), atom$)
    await jest.runAllTimersAsync()
    expect(values).toEqual(["idle", "fulfilled"])
    sub.unsubscribe()
  })
})
