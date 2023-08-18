export const range = (from: number, to: number) => {
	return new Array(to - from)
		.fill(0)
		.map((_, idx) => from + idx)
}
