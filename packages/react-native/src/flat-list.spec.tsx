import React from "react"
import { Text } from "react-native"
import { act, render } from "react-native-testing-library"
import { Atom } from "@rixio/atom"
import { RxFlatList, RxListRenderItem } from "./flat-list"

const renderItem: RxListRenderItem<string> = ({ item, index }) => {
	return (
		<Text testID={`item-${item}`} key={index}>
			{item}
		</Text>
	)
}

describe("FlatList", () => {
	test("should render flat list and observe changes", async () => {
		const atom = Atom.create(["1", "2", "3"])
		const r = render(<RxFlatList testID="flat-list" data={atom} renderItem={renderItem} />)
		expect(r.getByTestId("flat-list")).toBeTruthy()
		expect(r.findByTestId("item-1")).toBeTruthy()
		expect(() => r.getByTestId("item-4")).toThrow()
		act(() => atom.set(["4", "5", "6"]))
		expect(r.findByTestId("item-4")).toBeTruthy()
	})
})
