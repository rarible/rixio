import React from "react"

export type ListReactRenderer<T> = (item: T, measure: () => void) => React.ReactNode
export type GridReactRenderer<T> = (item: T) => React.ReactNode
