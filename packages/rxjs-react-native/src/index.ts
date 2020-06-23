import { Text, TextProps, View } from "react-native"
import { lift } from "@rixio/rxjs-react"
import { ComponentType } from "react"

type FixedTextProps = Omit<TextProps, "children"> & {
	children?: string | number
}

export const RxView = lift(View)
export const RxText = lift(Text as ComponentType<FixedTextProps>)
