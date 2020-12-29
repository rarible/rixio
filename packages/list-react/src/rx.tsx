import { RxPropsBase, useRx } from "@rixio/react";
import { WrappedObservable } from "@rixio/wrapped"
import React, { useCallback, useState } from "react";

export type BaseListProps<T> = {
	data: T[]
	loadNext: () => void
}

type InferItemType<Props extends BaseListProps<any>> = Props extends BaseListProps<infer T> ? T : never

export type RxReactListProps<T, Props extends BaseListProps<T>> = Omit<Props, "data" | "loadNext" > & RxPropsBase & {
  data$: WrappedObservable<Array<InferItemType<Props>>>
}


export function liftReactList<Props extends BaseListProps<any>>(Component: React.ComponentType<Props>) {
  function LiftedList({
    data$,
    pending,
    rejected,
    ...rest
  }: RxReactListProps<InferItemType<Props>, Props>) {
    const [nonce, setNonce] = useState(0)
    const data = useRx(data$, [data$, nonce])
    const loadNext = useCallback<() => void>(() => {
      if ("loadNext" in data$) {
        (data$ as any).loadNext()
      }
    }, [data$])

    switch (data.status) {
      case "fulfilled":
        // @ts-ignore
        return <Component data={data.value} loadNext={loadNext} {...rest} />
      case "pending":
        if (pending) {
          return <>{pending}</>
        } else {
          // @ts-ignore
          return <Component data={[]} loadNext={loadNext} {...rest} />
        }
      case "rejected":
        if (typeof rejected === "function") {
          const reload = () => {
            data.reload()
            setNonce(n => n + 1)
          }
          return <>{rejected(data.error, reload)}</>
        } else if (rejected) {
          return <>{rejected}</>
        } else {
          // @ts-ignore
          return <Component data={[]} loadNext={loadNext} {...rest} />
        }
    }

    return null
  }
  return LiftedList
}
