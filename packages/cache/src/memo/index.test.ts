import { Atom } from "@rixio/atom"
import { noop } from "rxjs"
import { first, map } from "rxjs/operators"
import type { CacheState } from "../domain"
import { CacheIdle } from "../domain"
import { MemoImpl } from "./index"

describe("MemoImpl", () => {
  jest.useFakeTimers()

  test("should load data when subscribed and idle", async () => {
    const testset = new TestSet({ timeout: 100 })
    const sub1 = testset.cache.subscribe(noop)
    expect(testset.impl.mock.calls).toHaveLength(1)
    expect(testset.statuses).toEqual(["idle"])
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "pending", "fulfilled"])
    sub1.unsubscribe()
    await testset.cache.get()
    expect(testset.impl.mock.calls).toHaveLength(1)
    testset.reset()
  })

  test("should invalidate cache", async () => {
    let changed = false
    const loader = jest.fn().mockImplementation(() => (changed ? Promise.resolve("hello") : Promise.resolve("world")))
    const testset = new TestSet({ cacheLiveTime: 100, customImpl: loader })
    const data1 = await testset.cache.get()
    expect(data1).toEqual("world")
    expect(loader.mock.calls).toHaveLength(1)
    expect(testset.statuses).toEqual(["idle", "fulfilled"])
    jest.advanceTimersByTime(110)
    changed = true
    const data2 = await testset.cache.get()
    expect(loader.mock.calls).toHaveLength(2)
    expect(data2).toEqual("hello")
    expect(testset.statuses).toEqual(["idle", "fulfilled", "idle", "fulfilled"])
    testset.reset()
  })

  test("should load immediately", async () => {
    const testset = new TestSet()
    const sub1 = testset.cache.subscribe(noop)
    expect(testset.statuses).toEqual(["idle"])
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "fulfilled"])
    sub1.unsubscribe()
    testset.reset()
  })

  test("should force get", async () => {
    const testset = new TestSet()
    await Promise.all(new Array(5).fill(0).map(() => testset.cache.get()))
    expect(testset.impl.mock.calls).toHaveLength(1)
    await testset.cache.get(true)
    expect(testset.impl.mock.calls).toHaveLength(2)
    testset.reset()
  })

  test("should set idle after clear and not start loading", async () => {
    const testset = new TestSet({ timeout: 100 })
    const cacheSub = testset.cache.subscribe(noop)
    expect(testset.statuses).toEqual(["idle"])
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "pending", "fulfilled"])
    cacheSub.unsubscribe()
    testset.cache.clear()
    expect(testset.statuses).toEqual(["idle", "pending", "fulfilled", "idle"])
    testset.reset()
  })

  test("should start loading right after clear if someone subscribed", async () => {
    const testset = new TestSet()
    const sub = testset.cache.subscribe(noop)
    expect(testset.statuses).toEqual(["idle"])
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "fulfilled"])
    testset.cache.clear()
    expect(testset.statuses).toEqual(["idle", "fulfilled", "idle"])
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "fulfilled", "idle", "fulfilled"])
    expect(testset.impl.mock.calls).toHaveLength(2)
    sub.unsubscribe()
    testset.reset()
  })

  test("set should work", async () => {
    const testset = new TestSet()
    await testset.cache.get()
    expect(testset.statuses).toEqual(["idle", "fulfilled"])
    testset.cache.set("other")
    expect(testset.statuses).toEqual(["idle", "fulfilled", "fulfilled"])
    await testset.cache.get()
    expect(testset.statuses).toEqual(["idle", "fulfilled", "fulfilled"])
  })

  test("rxjs operators should work", async () => {
    const testset = new TestSet()
    const value1 = await testset.cache
      .pipe(
        map(() => "mapped"),
        first(),
      )
      .toPromise()
    expect(value1).toBe("mapped")
  })

  test("should start fetching after subscribe on rejected Memo", async () => {
    const loader = jest
      .fn()
      .mockImplementation(() =>
        loader.mock.calls.length <= 1 ? Promise.reject("rejected") : Promise.resolve("resolved"),
      )
    const testset = new TestSet({ customImpl: loader })
    expect(loader.mock.calls.length).toEqual(0)
    const emitted: string[] = []

    // First call
    const sub1 = testset.cache.subscribe(x => emitted.push(x), noop)
    expect(loader.mock.calls.length).toEqual(1)
    await jest.runAllTimersAsync()
    expect(testset.statuses).toEqual(["idle", "rejected"])
    expect(emitted).toEqual([])
    sub1.unsubscribe()

    // Second call
    const sub2 = testset.cache.subscribe(x => emitted.push(x))
    await jest.runAllTimersAsync()
    expect(loader.mock.calls.length).toEqual(2)
    expect(testset.statuses).toEqual(["idle", "rejected", "idle", "fulfilled"])
    expect(emitted).toStrictEqual(["resolved"])
    sub2.unsubscribe()
  })
})

type TestSetConfig = {
  customImpl?: jest.Mock<string>
  timeout?: number
  cacheLiveTime?: number
}

class TestSet {
  readonly impl = jest.fn().mockImplementation(() => {
    const timeout = this.config.timeout
    if (typeof timeout !== "number") return Promise.resolve("loaded")
    return new Promise(r => setTimeout(() => r("loaded"), timeout))
  })

  readonly atom = Atom.create(CacheIdle.create())
  readonly cache = new MemoImpl<string>(this.atom, this.config.customImpl || this.impl, this.config.cacheLiveTime)
  readonly statuses: CacheState<unknown>["status"][] = []
  private readonly sub = this.atom.subscribe(x => this.statuses.push(x.status))

  constructor(private readonly config: TestSetConfig = {}) {}
  reset = () => this.sub.unsubscribe()
}
