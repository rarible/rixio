import React, { LegacyRef, ReactHTML, DetailedHTMLFactory } from "react"
import { Lifted } from "@rixio/rxjs-wrapped"
import { RxBaseProps, RxWrapperBase } from "./base"

type InferHtmlProps<K extends keyof React.ReactHTML> = React.ReactHTML[K] extends DetailedHTMLFactory<infer P, any>
	? P
	: never

type InferHtmlElementType<K extends keyof React.ReactHTML> = React.ReactHTML[K] extends DetailedHTMLFactory<
	any,
	infer T
>
	? T
	: never

type WithRef<K extends keyof React.ReactHTML> = { ref?: LegacyRef<InferHtmlElementType<K>> }

export type RxHtmlElementProps<K extends keyof ReactHTML> = Lifted<InferHtmlProps<K>> & WithRef<K>

export type RxHtmlProps<K extends keyof React.ReactHTML> = {
	component: K
	props?: RxHtmlElementProps<K>
}

export class RxHtml<K extends keyof React.ReactHTML> extends RxWrapperBase<InferHtmlProps<K>, RxHtmlProps<K>> {
	extractRxBaseProps(props: RxHtmlProps<K>): RxBaseProps | undefined {
		return undefined
	}

	extractProps({ props }: RxHtmlProps<K>): Lifted<InferHtmlProps<K>> {
		return props || ({} as any)
	}

	extractComponent({ component }: RxHtmlProps<K>): any {
		return component
	}
}

export function liftHtml<K extends keyof React.ReactHTML>(key: K): React.FC<RxHtmlElementProps<K>> {
	function LiftedComponent(props: RxHtmlElementProps<K>) {
		return <RxHtml component={key} props={props} />
	}

	LiftedComponent.displayName = `lifted(${key})`
	return LiftedComponent
}

export type LiftedIntrinsicsHTML = {
	readonly [K in keyof React.ReactHTML]: React.FunctionComponent<RxHtmlElementProps<K>>
}

function liftAll(html: Array<keyof ReactHTML>): LiftedIntrinsicsHTML {
	const r: {
		-readonly [K in keyof ReactHTML]?: React.FunctionComponent<RxHtmlElementProps<K>>
	} = {}

	// @ts-ignore
	html.forEach(e => (r[e] = liftHtml(e)))

	return r as LiftedIntrinsicsHTML
}

const html: (keyof ReactHTML)[] = [
	"a",
	"abbr",
	"address",
	"area",
	"article",
	"aside",
	"audio",
	"b",
	"base",
	"bdi",
	"bdo",
	"big",
	"blockquote",
	"body",
	"br",
	"button",
	"canvas",
	"caption",
	"cite",
	"code",
	"col",
	"colgroup",
	"data",
	"datalist",
	"dd",
	"del",
	"details",
	"dfn",
	"dialog",
	"div",
	"dl",
	"dt",
	"em",
	"embed",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"head",
	"header",
	"hgroup",
	"hr",
	"html",
	"i",
	"iframe",
	"img",
	"input",
	"ins",
	"kbd",
	"keygen",
	"label",
	"legend",
	"li",
	"link",
	"main",
	"map",
	"mark",
	"menu",
	"menuitem",
	"meta",
	"meter",
	"nav",
	"noscript",
	"object",
	"ol",
	"optgroup",
	"option",
	"output",
	"p",
	"param",
	"picture",
	"pre",
	"progress",
	"q",
	"rp",
	"rt",
	"ruby",
	"s",
	"samp",
	"script",
	"section",
	"select",
	"small",
	"source",
	"span",
	"strong",
	"style",
	"sub",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"textarea",
	"tfoot",
	"th",
	"thead",
	"time",
	"title",
	"tr",
	"track",
	"u",
	"ul",
	"var",
	"video",
	"wbr",
]

export const R = liftAll(html)
