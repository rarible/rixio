export type ListReactRendererItem<T> = { type: "item"; data: T } | { type: "pending" }
export type ListReactRenderer<T> = (item: ListReactRendererItem<T>) => React.ReactNode
