import type React from "react"

export type ListReactRenderer<T> = (
  item: T,
  measure: () => void,
  index: number,
  isScrolling: boolean,
) => React.ReactNode
export type GridReactRenderer<T> = (item: T, index: number, isScrolling: boolean) => React.ReactNode
