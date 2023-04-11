import { Atom } from "@rixio/atom"
import { CacheState } from "../../domain"
import { runPromiseWithCache } from "../run-promise-with-cache"

export async function save<T, K extends T>(promise: Promise<K>, atom: Atom<CacheState<T>>): Promise<K> {
	await runPromiseWithCache(promise, atom)
	return await promise
}
