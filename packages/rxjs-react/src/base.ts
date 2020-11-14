import React from "react"
import { Observable, Subscription } from "rxjs"
import { Lens } from "@rixio/lens"

const flagName = "___error___"
const errorFlag = Symbol.for(flagName)

function checkIsError(value: any) {
	return value !== null && value[flagName] === errorFlag
}

type CheckResult = { status: "fulfilled" } | { status: "rejected"; error: any } | { status: "pending" }
const fulfilled: { status: "fulfilled" } = { status: "fulfilled" }
const pending: { status: "pending" } = { status: "pending" }

function createRejected(error: any): { status: "rejected"; error: any } {
	return { status: "rejected", error }
}

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export type ObservableLike<T> = T | Observable<T>

export type Lifted<T> = {
	[K in keyof T]: ObservableLike<T[K]>
}

export type RxBaseProps = {
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any) => React.ReactNode>
}

export abstract class RxWrapperBase<P extends object, RProps extends object> extends React.Component<
	RProps,
	Lifted<P>
> {
	private _state: Lifted<P>
	private _mounted: boolean = false
	private subscriptions: Map<Observable<any>, Subscription> = new Map<Observable<any>, Subscription>()

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
		const result = this.checkObservables()
		switch (result.status) {
			case "fulfilled":
				return React.createElement(this.extractComponent(this.props), this.state as any)
			case "rejected":
				const rejected = this.extractRxBaseProps(this.props)?.rejected
				if (rejected && typeof rejected === "function") {
					return rejected(result.error)
				} else if (rejected) {
					return rejected
				} else {
					return null
				}
			case "pending":
				const pending = this.extractRxBaseProps(this.props)?.pending
				if (pending) {
					return pending
				}
				return null
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
						plain => self.handle(lens, plain),
						error => self.handle(lens, { error, [flagName]: errorFlag })
					)
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

	private checkObservables(): CheckResult {
		const result = walk(this._state, value => {
			if (value instanceof Observable) {
				return pending
			}
			if (checkIsError(value)) {
				return createRejected(value.error)
			}
		})
		if (result !== undefined) {
			return result
		}
		return fulfilled
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
