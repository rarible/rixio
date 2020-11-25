export type ListReactRendererItem<T> = { type: "item"; data: T } | { type: "pending" } | null
export type ListReactRenderer<T> = (item: ListReactRendererItem<T>) => React.ReactNode
