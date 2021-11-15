import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { SimpleCache } from "@rixio/lens"
import { Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { MemoImpl } from "./memo"
import { BatchHelper } from "./key-batch"
import {
	CacheState,
	createFulfilledCache,
	idleCache,
	KeyEvent,
	KeyMemo,
	ListDataLoader,
	Memo,
	UNDEFINED,
} from "./domain"
import { byKeyWithDefaultFactory } from "./utils"

export class KeyMemoImpl<K, V> implements KeyMemo<K, V> {
	private readonly batchHelper: BatchHelper<K>
	private readonly results: Subject<[K, V | typeof UNDEFINED]> = new Subject()
	private readonly lensFactory = byKeyWithDefaultFactory<K, CacheState<V>>(idleCache)
	private readonly singles = new SimpleCache<K, Memo<V>>(key => new MemoImpl(this.getAtom(key), () => this.load(key)))
	private readonly _events: Subject<KeyEvent<K>> = new Subject()
	public readonly events = this._events.pipe()

	constructor(
		private readonly map: Atom<IM<K, CacheState<V>>>,
		private readonly loader: ListDataLoader<K, V>,
		timeout: number = 50
	) {
		this.onBatchLoad = this.onBatchLoad.bind(this)
		this.batchHelper = new BatchHelper<K>(this.onBatchLoad, timeout)
	}

	private async onBatchLoad(keys: K[]) {
		try {
			const values = await this.loader(keys)
			const map = IM(values)
			keys.forEach(key => {
				if (map.has(key)) {
					this.results.next([key, map.get(key)!])
				} else {
					this.results.next([key, UNDEFINED])
				}
			})
		} catch (e) {
			keys.forEach(key => {
				this.results.next([key, UNDEFINED])
			})
		}
	}

	single(key: K): Memo<V> {
		return this.singles.getOrCreate(key, () => this.onCreate(key))
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.map.modify(x => x.set(key, createFulfilledCache(value)))
		this.onCreate(key)
	}

	onCreate(key: K) {
		this._events.next({ type: "add", key })
	}

	getAtom(key: K): Atom<CacheState<V>> {
		return this.map.lens(this.lensFactory(key))
	}

	private async load(key: K): Promise<V> {
		this.batchHelper.add(key)
		const [, v] = await this.results
			.pipe(
				filter(([k]) => key === k),
				first()
			)
			.toPromise()
		if (v !== UNDEFINED) {
			return v
		}
		throw new Error("Not found")
	}
}
