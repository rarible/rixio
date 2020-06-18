import React from "react"
import { Observable, Subscription } from "rxjs"
import { Lens } from "@grecha/lens"

export type ObservableLike<T> = T | Observable<T>

export type Lifted<T> = {
	[K in keyof T]: ObservableLike<T[K]>
}

function walk<T extends object>(
	props: T,
	handler: (value: any, lens: Lens<T, any>) => void,
) {
	for (const key in props) {
		if (props.hasOwnProperty(key)) {
			const prop = props[key] as any
			if (key === "children" && Array.isArray(prop)) {
				prop.forEach((v, idx) => {
					handler(v, Lens.compose(Lens.key("children"), Lens.index(idx)) as any)
				})
			} else {
				handler(prop, Lens.key(key) as any)
			}
		}
	}
}

export abstract class RxWrapperBase<P extends object, RProps extends object>
	extends React.Component<RProps, Lifted<P>> {

	private _state: Lifted<P>
	private _mounted: boolean = false
	private subscriptions: Map<Observable<any>, Subscription> = new Map<Observable<any>, Subscription>()

	constructor(props: RProps) {
		super(props)
		this._state = this.extractProps(props)
		this.doSubscribe({} as any, this.extractProps(props))
		this.checkNoObservables()
		this.state = this._state
	}

	abstract extractProps(props: RProps): Lifted<P>
	abstract extractComponent(props: RProps): any

	componentDidMount() {
		this._mounted = true
	}

	componentWillUnmount() {
		this._mounted = false
	}

	shouldComponentUpdate(
		nextProps: Readonly<RProps>,
		nextState: Readonly<Lifted<P>>,
		nextContext: any,
	): boolean {
		if (this.props !== nextProps) {
			const oldProps: Lifted<P> = this.extractProps(this.props as any)
			const newProps: Lifted<P> = this.extractProps(nextProps as any)
			this.doUnsubscribe(oldProps, newProps)
			this.doSubscribe(oldProps, newProps)
			this.setState(this._state)
		}
		return true
	}

	render() {
		return React.createElement(this.extractComponent(this.props), this.state as any)
	}

	private doSubscribe(oldProps: Lifted<P>, props: Lifted<P>) {
		const self = this
		walk(props, (value, lens) => {
			if (value instanceof Observable) {
				let oldValue: any
				try {
					oldValue = lens.get(oldProps)
				} catch (e) {
					oldValue = undefined
				}
				if (oldValue !== value) {
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
