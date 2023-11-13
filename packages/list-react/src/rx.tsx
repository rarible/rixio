import type { RxPropsBase } from "@rixio/react"
import { useRx } from "@rixio/react"
import type { OWLike } from "@rixio/wrapped"
import React, { useCallback, useState } from "react"

export type BaseListProps<T> = {
  data: T[]
  loadNext: () => void
}

type InferItemType<Props extends BaseListProps<any>> = Props extends BaseListProps<infer T> ? T : never

export type RxReactListProps<T, Props extends BaseListProps<T>> = Omit<Props, "data" | "loadNext"> &
  RxPropsBase & {
    data$: OWLike<Array<InferItemType<Props>>>
  }

export function liftReactList<Props extends BaseListProps<any>>(Component: React.ComponentType<Props>) {
  return function LiftedList({ data$, pending, rejected, ...rest }: RxReactListProps<InferItemType<Props>, Props>) {
    const [nonce, setNonce] = useState(0)
    const data = useRx(data$, [data$, nonce])
    const loadNext = useCallback(() => {
      if ("loadNext" in data$) {
        ;(data$ as any).loadNext()
      }
    }, [data$])

    switch (data.status) {
      case "fulfilled":
        // @ts-ignore
        return <Component data={data.value} loadNext={loadNext} {...rest} />
      case "pending":
        if (pending) {
          return pending
        } else {
          // @ts-ignore
          return <Component data={[]} loadNext={loadNext} {...rest} />
        }
      case "rejected":
        if (typeof rejected === "function") {
          return rejected(data.error, () => {
            data.reload()
            setNonce(n => n + 1)
          })
        } else if (rejected) {
          return rejected
        } else {
          // @ts-ignore
          return <Component data={[]} loadNext={loadNext} {...rest} />
        }
      default:
        return null
    }
  }
}
