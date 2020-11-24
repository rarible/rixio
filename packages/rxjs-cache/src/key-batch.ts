export class BatchHelper<K> {
	private timer: number | null = null
	private readonly batch: Set<K> = new Set()

	constructor(
		private readonly onDrop: (items: K[]) => void,
		private readonly timeout: number,
	) {
		this.drop = this.drop.bind(this)
	}

	add(item: K) {
		if (this.timer === null) {
			this.timer = setTimeout(this.drop, this.timeout)
		}
		this.batch.add(item)
	}

	drop() {
		this.timer = null
		this.onDrop(Array.from(this.batch))
		this.batch.clear()
	}
}
