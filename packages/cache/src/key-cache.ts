import { Map as IM } from "immutable"
import { Atom } from "@rixio/atom"
import { SimpleCache } from "@rixio/lens"
import { Subject } from "rxjs"
import { filter, first } from "rxjs/operators"
import { CacheImpl } from "./cache"
import { BatchHelper } from "./key-batch"
import * as Domain from "./domain"
import { byKeyWithDefaultFactory } from "./utils"

export class KeyCacheImpl<K, V> implements Domain.KeyCache<K, V> {
	private readonly batchHelper: BatchHelper<K>
	private readonly results = new Subject<[K, V | Domain.NotFound]>()
	private readonly lensFactory = byKeyWithDefaultFactory<K, Domain.CacheState<V>>(Domain.idleCache)
	private readonly _events = new Subject<Domain.KeyEvent<K>>()
	readonly events = this._events.pipe()

	private readonly singles = new SimpleCache<K, Domain.Cache<V>>(key => {
		return new CacheImpl(this.getAtom(key), () => {
			return this.load(key)
		})
	})

	constructor(
		private readonly map: Atom<IM<K, Domain.CacheState<V>>>,
		private readonly loader: Domain.ListDataLoader<K, V>,
		timeout: number = 100
	) {
		this.onBatchLoad = this.onBatchLoad.bind(this)
		this.batchHelper = new BatchHelper<K>(this.onBatchLoad, timeout)
	}

	private async onBatchLoad(keys: K[]) {
		try {
			const values = await this.loader(keys)
			values.forEach(([key, value]) => {
				this.results.next([key, value])
			})
		} catch (e) {
			console.error(e)
			keys.forEach(k => {
				this.results.next([k, Domain.UNDEFINED])
			})
		}
	}

	single(key: K): Domain.Cache<V> {
		return this.singles.getOrCreate(key, () => {
			this.onCreate(key)
		})
	}

	get(key: K, force?: boolean): Promise<V> {
		return this.single(key).get(force)
	}

	set(key: K, value: V): void {
		this.map.modify(x => {
			return x.set(key, Domain.createFulfilledCache(value))
		})
		this.onCreate(key)
	}

	onCreate(key: K) {
		this._events.next(Domain.createAddEvent(key))
	}

	getAtom(key: K): Atom<Domain.CacheState<V>> {
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
		if (Domain.isNotFound(v)) {
			throw new Error(`Entity with key "${key}" not found`)
		}
		return v
	}
}
