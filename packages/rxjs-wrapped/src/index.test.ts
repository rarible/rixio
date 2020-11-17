import { Subject } from "rxjs"
import { createFulfilledWrapped, createRejectedWrapped, Wrapped } from "./domain";
import { wrap } from "./index"

describe("wrap", () => {
	test("should wrap plain observable", () => {
		const s = new Subject<number>()
		const wrapped = wrap(s)
    let emitted: Array<Wrapped<number>> = []
    wrapped.subscribe(
      v => emitted.push(v)
    )
    expect(emitted.length).toBe(1)
    expect(emitted[0].status).toBe("pending")

    s.next(1)
    expect(emitted.length).toBe(2)
    const em2 = emitted[1]
    expect(em2.status).toBe("fulfilled")
    expect((em2 as any).value).toBe(1)

    s.error("reason")
    expect(emitted.length).toBe(3)
    const em3 = emitted[2]
    expect(em3.status).toBe("rejected")
    expect((em3 as any).error).toBe("reason")
	})

  test("should do nothing if it's already wrapped", () => {
    const s = new Subject<Wrapped<number>>()
    const wrapped = wrap(s)
    let emitted: Array<Wrapped<number>> = []
    wrapped.subscribe(
      v => emitted.push(v)
    )
    expect(emitted.length).toBe(1)
    expect(emitted[0].status).toBe("pending")

    s.next(createFulfilledWrapped(1))
    expect(emitted.length).toBe(2)
    const em2 = emitted[1]
    expect(em2.status).toBe("fulfilled")
    expect((em2 as any).value).toBe(1)

    s.next(createRejectedWrapped("reason"))
    expect(emitted.length).toBe(3)
    const em3 = emitted[2]
    expect(em3.status).toBe("rejected")
    expect((em3 as any).error).toBe("reason")

    s.next(createRejectedWrapped("reason2"))
    expect(emitted.length).toBe(4)
    const em4 = emitted[3]
    expect(em4.status).toBe("rejected")
    expect((em4 as any).error).toBe("reason2")
  })
})
