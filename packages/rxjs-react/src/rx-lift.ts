import { Lifted, RxWrapperBase } from "./base"
import { ComponentType } from "react"

export type RxProps<P extends object> = Lifted<P> & {
	component: ComponentType<P>
}

export class RxLift<P extends object> extends RxWrapperBase<P, RxProps<P>> {
	extractProps({ component, ...rest }: RxProps<P>): Lifted<P> {
		return rest as any
	}

	extractComponent({ component }: RxProps<P>): any {
		return component
	}
}
