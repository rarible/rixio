export type ApiData = {
	id: string,
	value: number
}

export const apiItems = new Array(100).fill(1).map((_, index) => ({
	id: index.toString(),
	value: index,
}) as ApiData)

export type LoadPageContinuation = number

export const api = {
	loadPage: (page: LoadPageContinuation, perPage: number) =>
		Promise.resolve(apiItems.slice(page * perPage, page * perPage + perPage)),
}
