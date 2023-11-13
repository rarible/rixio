import { Atom } from "@rixio/atom"
import { Map as IM } from "immutable"
import { Subscription } from "rxjs"
import type { KeyEvent, CacheState, KeyEventError } from "../domain"
import { createAddKeyEvent, createErrorKeyEvent, CacheFulfilled } from "../domain"
import { UnknownError } from "../utils/errors"
import { KeyMemoImpl } from "../key-memo"

describe("KeyMemoImpl", () => {
  jest.useFakeTimers()

  test("should have 2 batched requests (2 and 1)", async () => {
    const testset = new TestSet()
    const sub = new Subscription()

    const single = testset.cache.single("testing")
    expect(testset.atom.get().size).toBe(0)
    sub.add(single.subscribe())
    const other$ = testset.cache.single("other")
    sub.add(other$.subscribe())
    expect(testset.impl.mock.calls).toHaveLength(0)
    single.get()
    await jest.runAllTimersAsync()
    expect(single.atom.get()).toEqual(CacheFulfilled.create("testing"))
    expect(testset.atom.get().size).toBe(2)
    expect(testset.impl.mock.calls).toHaveLength(1)

    const other2$ = testset.cache.single("other2")
    sub.add(other2$.subscribe())
    other2$.get()
    await jest.runAllTimersAsync()
    expect(other2$.atom.get()).toEqual(CacheFulfilled.create("other2"))

    expect(testset.impl.mock.calls).toHaveLength(2)
    expect(testset.atom.get().size).toBe(3)

    sub.unsubscribe()
  })

  test("should not batch requests if key already loaded", async () => {
    const testset = new TestSet()
    const loadAndCheck = async () => {
      const single1 = testset.cache.single("single")
      single1.get()
      await jest.runAllTimersAsync()
    }
    await loadAndCheck()
    expect(testset.impl.mock.calls).toHaveLength(1)
    await loadAndCheck()
    expect(testset.impl.mock.calls).toHaveLength(1)
  })

  test("should be reloaded if cleared", async () => {
    const testset = new TestSet()
    const emitted: Array<string> = []
    const key1$ = testset.cache.single("key1")
    const sub = key1$.subscribe(x => emitted.push(x))
    key1$.get()
    await jest.runAllTimersAsync()
    expect(testset.impl.mock.calls).toHaveLength(1)
    expect(emitted).toEqual(["key1"])
    key1$.clear()
    key1$.get()
    await jest.runAllTimersAsync()
    expect(testset.impl.mock.calls).toHaveLength(2)
    expect(emitted).toEqual(["key1", "key1"])
    sub.unsubscribe()
  })

  test("should put new entry in events Subject", async () => {
    const testset = new TestSet()

    const emitted: KeyEvent<string>[] = []
    const sub = testset.cache.events.subscribe(x => emitted.push(x))
    testset.cache.get("test").then()
    expect(emitted.length).toBe(1)
    expect(emitted[0]).toStrictEqual(createAddKeyEvent("test"))

    testset.cache.get("test2").then()
    expect(emitted.length).toBe(2)
    expect(emitted[1]).toStrictEqual(createAddKeyEvent("test2"))

    testset.cache.set("test3", "test3")
    expect(emitted.length).toBe(3)
    expect(emitted[2]).toStrictEqual(createAddKeyEvent("test3"))

    sub.unsubscribe()
  })

  test("should mark items as errors if load list fails", async () => {
    const loader = jest.fn().mockImplementation(() => Promise.reject("rejected"))
    const testset = new TestSet(undefined, loader)
    const valuesEmitted: string[] = []
    const emittedEvents: KeyEvent<string>[] = []
    testset.cache.events.subscribe(x => emittedEvents.push(x))
    const errorsEmitted: unknown[] = []
    const test$ = testset.cache.single("test")
    const sub = test$.subscribe({
      next: x => valuesEmitted.push(x),
      error: e => errorsEmitted.push(e),
    })
    await jest.runAllTimersAsync()
    expect(valuesEmitted.length).toBe(0)
    expect(errorsEmitted.length).toBe(1)
    expect(errorsEmitted[0]).toBeInstanceOf(UnknownError)
    expect(emittedEvents.length).toEqual(3)
    expect(emittedEvents[0]).toStrictEqual(createAddKeyEvent("test"))
    expect(emittedEvents[1]).toStrictEqual(createErrorKeyEvent("test", "rejected"))
    expect((emittedEvents[2] as KeyEventError<string>).error).toBeInstanceOf(UnknownError)
    sub.unsubscribe()
  })
})

class TestSet {
  readonly impl = jest.fn().mockImplementation((keys: string[]) => {
    const timeout = this.timeout
    const getValues = () => keys.map(k => [k, k])
    if (typeof timeout !== "number") return Promise.resolve(getValues())
    return new Promise(r => setTimeout(() => r(getValues()), timeout))
  })

  readonly atom = Atom.create(IM<string, CacheState<string>>())
  readonly cache = new KeyMemoImpl<string, string>({
    map: this.atom,
    loader: this.customImpl || this.impl,
  })

  constructor(private readonly timeout?: number, private readonly customImpl?: jest.Mock<string>) {}
}
