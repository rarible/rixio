import { ComponentType } from "react"
import { Lifted } from "@rixio/wrapped"
import { RxBaseProps, RxWrapperBase } from "./base"

export type RxWrapperProps<P extends object> = Lifted<P> &
	RxBaseProps & {
		component: ComponentType<P>
	}

export class RxWrapper<P extends object> extends RxWrapperBase<P, RxWrapperProps<P>> {
	extractRxBaseProps(): RxBaseProps | undefined {
		return this.props
	}

	extractProps({ component, ...rest }: RxWrapperProps<P>): Lifted<P> {
		return rest as any
	}

	extractComponent({ component }: RxWrapperProps<P>): any {
		return component
	}
}
