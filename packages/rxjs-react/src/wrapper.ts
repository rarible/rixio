import React, { ComponentType } from "react"
import { Observable, Subscription } from "rxjs"
import { Lens } from "@grecha/lens"

export type SimpleLifted<T> = {
	[K in keyof T]: T[K] | Observable<T[K]>
}

export type Lifted<T> = SimpleLifted<T>

export type RxProps<P extends object> = {
	component: ComponentType<P>
} & Lifted<P>

function walk<T extends object>(
	props: T,
	handler: (value: any, lens: Lens<T, any>) => void,
) {
	for (const key in props) {
		if (props.hasOwnProperty(key)) {
			const prop = props[key] as any
			handler(prop, Lens.key(key) as any)
		}
	}
}

function omitComponent<P extends object>(rxProps: RxProps<P>): Lifted<P> {
	const { component, ...rest } = rxProps
	return rest as any
}

export class RxWrapper<P extends object> extends React.Component<RxProps<P>, Lifted<P>> {
	private _state: Lifted<P>
	private _mounted: boolean = false
	private subscriptions: Map<Observable<any>, Subscription> = new Map<Observable<any>, Subscription>()

	constructor(props: RxProps<P>) {
		super(props)
		this._state = omitComponent(props)
		this.doSubscribe({} as any, props)
		this.checkNoObservables()
		this.state = this._state
	}

	componentDidMount() {
		this._mounted = true
	}

	componentWillUnmount() {
		this._mounted = false
	}

	shouldComponentUpdate(
		nextProps: Readonly<RxProps<P>>,
		nextState: Readonly<Lifted<P>>,
		nextContext: any,
	): boolean {
		if (this.props !== nextProps) {
			const oldProps: Lifted<P> = omitComponent(this.props as any)
			const newProps: Lifted<P> = omitComponent(nextProps as any)
			this.doUnsubscribe(oldProps, newProps)
			this.doSubscribe(oldProps, newProps)
			this.setState(this._state)
		}
		return true
	}

	render() {
		return React.createElement(this.props.component, this.state as any)
	}

	private doSubscribe(oldProps: Lifted<P>, props: Lifted<P>) {
		const self = this
		walk(props, (value, lens) => {
			if (value instanceof Observable) {
				if (lens.get(oldProps) !== value) {
					const s = value.subscribe(plain => {
						self.handle(lens, plain)
					})
					self.subscriptions.set(value, s)
				}
			} else {
				self._state = lens.set(value, self._state)
			}
		})
	}

	private doUnsubscribe(oldProps: Lifted<P>, newProps: Lifted<P>) {
		const self = this
		walk(oldProps, (value, lens) => {
			if (value instanceof Observable && lens.get(newProps) !== value) {
				self.subscriptions.get(value)!.unsubscribe()
				self.subscriptions.delete(value)
			}
		})
	}

	private handle(lens: Lens<Lifted<P>, any>, value: any) {
		const newState = lens.set(value, this._state)
		if (newState !== this._state) {
			this._state = newState
			if (this._mounted) {
				this.setState(newState)
			}
		}
	}

	private checkNoObservables() {
		walk(this._state, value => {
			if (value instanceof Observable) {
				throw new Error("Observable doesn't emit value immediately")
			}
		})
	}
}
