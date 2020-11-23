export function getTwoDimIndex(row: number, column: number) {
	return (row + 1) * (column + 1) + row
}
