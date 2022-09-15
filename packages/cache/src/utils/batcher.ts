export class Batcher<K> {
	private timer: NodeJS.Timeout | null = null
	private readonly batch: Set<K> = new Set()

	constructor(private readonly onDrop: (items: K[]) => void, private readonly timeout: number) {}

	add = (item: K) => {
		if (this.timer === null) {
			this.timer = setTimeout(this.drop, this.timeout)
		}
		this.batch.add(item)
	}

	drop = () => {
		this.timer = null
		this.onDrop(Array.from(this.batch))
		this.batch.clear()
	}
}
