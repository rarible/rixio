import type { ComponentType } from "react"
import type { Lifted } from "@rixio/wrapped"
import type { RxBaseProps } from "./base"
import { RxWrapperBase } from "./base"

export type RxWrapperProps<P extends object> = Lifted<P> &
  RxBaseProps & {
    component: ComponentType<P>
  }

export class RxWrapper<P extends object> extends RxWrapperBase<P, RxWrapperProps<P>> {
  extractRxBaseProps(): RxBaseProps | undefined {
    return this.props
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extractProps({ component, ...rest }: RxWrapperProps<P>): Lifted<P> {
    return rest as any
  }

  extractComponent({ component }: RxWrapperProps<P>): any {
    return component
  }
}
