import type { ComponentType } from "react"
import React from "react"
import type { Lifted } from "@rixio/wrapped"
import type { RxBaseProps } from "./base"
import { RxWrapperBase } from "./base"

export type RxLiftProps<P extends object> = RxBaseProps & {
  component: ComponentType<P>
  props: Lifted<P>
}

export class RxLift<P extends object> extends RxWrapperBase<P, RxLiftProps<P>> {
  extractRxBaseProps(): RxBaseProps | undefined {
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
