import { Lifted, RxWrapperBase } from "./base"
import React, { ComponentType } from "react"

export type RxLiftProps<P extends object> = {
	component: ComponentType<P>
	props: Lifted<P>
}

export class RxLift<P extends object> extends RxWrapperBase<P, RxLiftProps<P>> {
	extractProps({ props }: RxLiftProps<P>): Lifted<P> {
		return props
	}

	extractComponent({ component }: RxLiftProps<P>): any {
		return component
	}
}

export function lift<P extends object>(component: ComponentType<P>): React.FC<Lifted<P>> {
	function LiftedComponent(props: Lifted<P>) {
		return <RxLift component={component} props={props}/>
	}

	LiftedComponent.displayName = `lifted(${component.displayName})`
	return LiftedComponent
}
