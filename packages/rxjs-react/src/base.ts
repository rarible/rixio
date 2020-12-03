import React from "react"
import { Observable, Subscription } from "rxjs"
import { Lens } from "@rixio/lens"
import { Wrapped, createRejectedWrapped, toWrapped, pendingWrapped, Rejected, Lifted } from "@rixio/rxjs-wrapped"

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export type RxBaseProps = {
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => void) => React.ReactNode>
}

export abstract class RxWrapperBase<P extends object, RProps extends object> extends React.Component<
	RProps,
	Lifted<P>
> {
	private _state: Lifted<P>
	private _mounted: boolean = false
	private subscriptions: Map<Observable<any>, [Subscription, Lens<Lifted<P>, any>]> = new Map()

	constructor(props: RProps) {
		super(props)
		this._state = this.extractProps(props)
		this.doSubscribe({} as any, this.extractProps(props))
		this.state = this._state
	}

	abstract extractRxBaseProps(props: RProps): RxBaseProps | undefined

	abstract extractProps(props: RProps): Lifted<P>

	abstract extractComponent(props: RProps): any

	componentDidMount() {
		this._mounted = true
	}

	componentWillUnmount() {
		this._mounted = false
	}

	shouldComponentUpdate(nextProps: Readonly<RProps>, nextState: Readonly<Lifted<P>>, nextContext: any): boolean {
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
		const result = toWrapped(this.checkObservables())
		switch (result.status) {
			case "fulfilled":
				return React.createElement(this.extractComponent(this.props), result.value as any)
			case "pending":
				const pending = this.extractRxBaseProps(this.props)?.pending
				if (pending) {
					return pending
				}
				return null
			case "rejected":
				const rejected = this.extractRxBaseProps(this.props)?.rejected
				if (rejected && typeof rejected === "function") {
					return rejected(result.error, result.reload)
				} else if (rejected) {
					return rejected
				} else {
					return null
				}
		}
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
					const s = value.subscribe(
						plain => self.handle(lens, toWrapped(plain)),
						error => self.handle(lens, createRejectedWrapped(error))
					)
					self.subscriptions.set(value, [s, lens])
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
				self.subscriptions.get(value)![0].unsubscribe()
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

	private checkObservables(): Lifted<P> | Wrapped<any> {
		const self = this
		let foundPending = false
		const rejected: Rejected[] = []
		let props = this._state
		walk(this._state, (value, lens) => {
			if (value instanceof Observable) {
				foundPending = true
			}
			const wrapped = toWrapped(value)
			if (wrapped.status === "rejected") {
				rejected.push(wrapped)
			} else if (wrapped.status === "pending") {
				foundPending = true
			} else {
				props = lens.set(wrapped.value, props)
			}
		})
		if (foundPending) return pendingWrapped
		if (rejected.length > 0) {
			const reload = () => {
				rejected.forEach(r => r.reload())
				self.subscriptions.forEach(([s, lens], obs) => {
					s.unsubscribe()
					const newSubscription = obs.subscribe(
						plain => self.handle(lens, toWrapped(plain)),
						error => self.handle(lens, createRejectedWrapped(error))
					)
					self.subscriptions.set(obs, [newSubscription, lens])
				})
			}
			return createRejectedWrapped(rejected[0].error, reload)
		}
		return props
	}
}

function walk<T extends object, R>(props: T, handler: (value: any, lens: Lens<T, any>) => R | undefined) {
	for (const key in props) {
		if (props.hasOwnProperty(key)) {
			const prop = props[key] as any
			if (key === "children" && Array.isArray(prop)) {
				for (let i = 0; i < prop.length; i++) {
					const result = handler(prop[i], Lens.compose(Lens.key("children"), Lens.index(i)) as any)
					if (result !== undefined) {
						return result
					}
				}
			} else {
				const result = handler(prop, Lens.key(key) as any)
				if (result !== undefined) {
					return result
				}
			}
		}
	}
}
