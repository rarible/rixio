import React from "react"
import type { Observable } from "rxjs"
import { useRx } from "./use-rx"
import type { OrReactChild } from "./base"

export interface RxIfProps {
  test$: Observable<any>
  else?: OrReactChild<() => React.ReactNode>
  negate?: boolean
  children: React.ReactNode
}

export function RxIf({ test$, children, negate, else: not }: RxIfProps): React.ReactElement | null {
  const raw = useRx(test$)
  const truthy = raw.status === "fulfilled" && Boolean(raw.value)

  if (negate && !truthy) {
    return <>{children}</>
  } else if (negate) {
    if (typeof not === "function") return <>{not()}</>
    else return <>{not}</>
  } else if (truthy) {
    return <>{children}</>
  } else {
    if (typeof not === "function") return <>{not()}</>
    else return <>{not}</>
  }
}
