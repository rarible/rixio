export const range = (from: number, to: number) => {
	return Array(to - from)
		.fill(0)
		.map((_, idx) => from + idx)
}
