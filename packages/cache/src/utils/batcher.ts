export class Batcher<K> {
	private timer: NodeJS.Timeout | null = null
	private batch: K[] = []

	constructor(private readonly onDrop: (items: K[]) => void, private readonly timeout: number) {}

	add = (item: K) => {
		if (this.timer === null) {
			this.timer = setTimeout(() => {
				this.timer = null
				this.onDrop(this.batch)
				this.batch = []
			}, this.timeout)
		}
		this.batch.push(item)
	}
}
