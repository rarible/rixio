import React, { ComponentType } from "react"
import { Lifted, RxBaseProps, RxWrapperBase } from "./base"

export type RxLiftProps<P extends object> = RxBaseProps & {
	component: ComponentType<P>
	props: Lifted<P>
}

export class RxLift<P extends object> extends RxWrapperBase<P, RxLiftProps<P>> {
	extractRxBaseProps(props: RxLiftProps<P>): RxBaseProps | undefined {
		return this.props
	}

	extractProps({ props }: RxLiftProps<P>): Lifted<P> {
		return props
	}

	extractComponent({ component }: RxLiftProps<P>): any {
		return component
	}
}

export function lift<P extends object>(component: ComponentType<P>, baseProps?: RxBaseProps): React.FC<Lifted<P>> {
	function LiftedComponent(props: Lifted<P>) {
		return <RxLift component={component} props={props} {...baseProps} />
	}

	LiftedComponent.displayName = `lifted(${component.displayName})`
	return LiftedComponent
}
