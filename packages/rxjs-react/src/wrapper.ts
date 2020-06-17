import { Lifted, ReactiveProps, RxWrapperBase } from "./base"

export type RxProps<P extends object> = Lifted<P> & ReactiveProps<P>

export class RxWrapper<P extends object> extends RxWrapperBase<P, RxProps<P>> {
	extractProps({ component, ...rest }: RxProps<P>): Lifted<P> {
		return rest as any
	}
}
