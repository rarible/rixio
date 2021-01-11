import { Atom } from "@rixio/atom"
import { pendingWrapped, Wrapped } from "@rixio/wrapped";
import { waitFor } from "@testing-library/react"
import { InfiniteList, ListItem, mapperFactory, MapperFactoryProps } from "./infinite-list";
import { InfiniteListState, ListPartLoader, listStateIdle } from "./domain"

describe("mapper", () => {
	function init(props?: MapperFactoryProps) {
		const mapper = mapperFactory<number, number>(props)
		const loadNextInvocations: boolean[] = []
		const fakeList$ = {
			pageSize: 10,
			loadNext(force?: boolean) {
				loadNextInvocations.push(Boolean(force))
			}
		} as InfiniteList<number, number>
		return [mapper, loadNextInvocations, fakeList$] as const
	}

	it("should emit Wrapped pending if nothing is loaded and initial = wrapped", () => {
		const [mapper, loadNextInvocations, fakeList$] = init()

		const pending = mapper({ status: "pending", finished: false, continuation: null, items: [] }, fakeList$)
		expect(pending).toBe(pendingWrapped)
		expect(loadNextInvocations.length).toBe(0)
	})

	it("should emit Wrapped rejected if nothing is loaded and initial = wrapped", () => {
		const [mapper, loadNextInvocations, fakeList$] = init()

		const rejected = mapper({ status: "rejected", error: "error1", finished: false, continuation: null, items: [] }, fakeList$)
		expect(rejected.status).toBe("rejected")
		expect((rejected as any).error).toBe("error1");
		(rejected as any).reload()
		expect(loadNextInvocations.length).toBe(1)
		expect(loadNextInvocations[0]).toBe(true)
	})

	it("should create fake pending items if initial = fake", () => {
		const [mapper, loadNextInvocations, fakeList$] = init({ initial: "fake" })

		const pending = mapper({ status: "pending", finished: false, continuation: null, items: [] }, fakeList$)
		expect(pending.status).toBe("fulfilled")
		expect((pending as any).value.length).toBe(10)
		expect((pending as any).value[0].type).toBe("pending")
		expect(loadNextInvocations.length).toBe(0);
		(pending as any).value[0].loadNext()
		expect(loadNextInvocations.length).toBe(1)
		expect(loadNextInvocations[0]).toBe(false)
	})

	it("should create fake rejected item if initial = fake", () => {
		const [mapper, loadNextInvocations, fakeList$] = init({ initial: "fake" })

		const rejected = mapper({ status: "rejected", error: "error1", finished: false, continuation: null, items: [] }, fakeList$)
		expect(rejected.status).toBe("fulfilled")
		expect((rejected as any).value.length).toBe(1)
		expect((rejected as any).value[0].type).toBe("rejected")
		expect(loadNextInvocations.length).toBe(0);
		(rejected as any).value[0].reload()
		expect(loadNextInvocations.length).toBe(1)
		expect(loadNextInvocations[0]).toBe(true)
	})

	it("should create fake pending items for second page", () => {
		const [mapper, loadNextInvocations, fakeList$] = init({ initial: "fake" })

		const pending = mapper({ status: "pending", finished: false, continuation: 1, items: [0] }, fakeList$)
		expect(pending.status).toBe("fulfilled")
		expect((pending as any).value.length).toBe(11)
		expect((pending as any).value[0].type).toBe("item")
		expect((pending as any).value[0].value).toBe(0)
		expect((pending as any).value[1].type).toBe("pending")
		expect(loadNextInvocations.length).toBe(0);
		(pending as any).value[1].loadNext()
		expect(loadNextInvocations.length).toBe(1)
		expect(loadNextInvocations[0]).toBe(false)
	})

	it("should create fake rejected item for second page", () => {
		const [mapper, loadNextInvocations, fakeList$] = init({ initial: "fake" })

		const rejected = mapper({ status: "rejected", error: "error1", finished: false, continuation: 1, items: [0] }, fakeList$)
		expect(rejected.status).toBe("fulfilled")
		expect((rejected as any).value.length).toBe(2)
		expect((rejected as any).value[0].type).toBe("item")
		expect((rejected as any).value[0].value).toBe(0)
		expect((rejected as any).value[1].type).toBe("rejected")
		expect(loadNextInvocations.length).toBe(0);
		(rejected as any).value[1].reload()
		expect(loadNextInvocations.length).toBe(1)
		expect(loadNextInvocations[0]).toBe(true)
	})
})

describe("InfiniteList", () => {
	it("should load first page when subscribed", async () => {
		const state$ = Atom.create<InfiniteListState<number, string>>(listStateIdle)
		const requests: Array<[number, string | null]> = []
		const loader: ListPartLoader<number, string> = async (size, cont) => {
			requests.push([size, cont])
			return [[0, 1, 2], "first"]
		}
		const list$ = new InfiniteList(state$, loader, 10, { pendingPageSize: 0 })
		const results: Array<Wrapped<ListItem<number>[]>> = []
		list$.subscribe(next => results.push(next))

		expect(requests.length).toBe(1)
		expect(requests[0]).toStrictEqual([10, null])

		await waitFor(() => {
			expect(results.length).toBe(2)
			expect(results[1].status).toBe("fulfilled")
			expect((results[1] as any).value.map((x: any) => x.value)).toStrictEqual([0, 1, 2])
		})
	})
})
