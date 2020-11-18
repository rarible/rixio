import { ComponentType } from "react"
import { Lifted, RxBaseProps, RxWrapperBase } from "./base"

export type RxWrapperProps<P extends object> = Lifted<P> &
	RxBaseProps & {
		component: ComponentType<P>
	}

export class RxWrapper<P extends object> extends RxWrapperBase<P, RxWrapperProps<P>> {
	extractRxBaseProps(props: RxWrapperProps<P>): RxBaseProps | undefined {
		return this.props
	}

	extractProps({ component, ...rest }: RxWrapperProps<P>): Lifted<P> {
		return rest as any
	}

	extractComponent({ component }: RxWrapperProps<P>): any {
		return component
	}
}
