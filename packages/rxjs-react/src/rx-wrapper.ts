import { ComponentType } from "react"
import { Lifted, RxWrapperBase } from "./base"

export type RxWrapperProps<P extends object> = Lifted<P> & {
	component: ComponentType<P>
}

export class RxWrapper<P extends object> extends RxWrapperBase<P, RxWrapperProps<P>> {
	extractProps({ component, ...rest }: RxWrapperProps<P>): Lifted<P> {
		return rest as any
	}

	extractComponent({ component }: RxWrapperProps<P>): any {
		return component
	}
}
