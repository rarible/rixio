import { NativeSyntheticEvent, NativeScrollEvent } from "react-native"
import { Atom } from "@rixio/atom"
import { InfiniteListState } from "@rixio/list"
import { useCallback } from "react"

function isScrollCloseToBottom(offset: number, ev: NativeSyntheticEvent<NativeScrollEvent>) {
	return (
		ev.nativeEvent.layoutMeasurement.height + ev.nativeEvent.contentOffset.y >=
		ev.nativeEvent.contentSize.height - offset
	)
}

export function useInfiniteListScrollEvent(
	state: Atom<InfiniteListState<any, any>>,
	loadNext: () => Promise<void>,
	offset: number
) {
	return useCallback(
		(ev: NativeSyntheticEvent<NativeScrollEvent>) => {
			const { finished, status } = state.get()

			if (status === "fulfilled" && !finished && isScrollCloseToBottom(offset, ev)) {
				loadNext().then()
			}
		},
		[offset, loadNext, state]
	)
}
