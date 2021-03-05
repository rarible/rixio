import React from "react"

export type ListReactRenderer<T> = (item: T, measure: () => void, isScrolling: boolean) => React.ReactNode
export type GridReactRenderer<T> = (item: T, isScrolling: boolean) => React.ReactNode
