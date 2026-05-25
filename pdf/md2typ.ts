import { marked } from "npm:marked"

type AnyToken = Record<string, unknown>

export type MdToTypstOptions = {
    knownChapters?: Set<string>
}

let knownChapterAnchors: Set<string> | null = null
let skipFootnoteRegexes: RegExp[] | null = null

export function mdToTypst(markdown: string, options: MdToTypstOptions = {}): string {
    knownChapterAnchors = options.knownChapters ?? null
    skipFootnoteRegexes = collectSkipFootnoteRegexes(markdown)
    try {
        const normalizedMarkdown = normalizeMarkdown(markdown)

        const tokens = marked.lexer(normalizedMarkdown, {
            gfm: true,
            breaks: false,
        }) as unknown as AnyToken[]

        const body = renderBlocks(tokens).trim()
        if (body.length === 0) {
            return ""
        }

        // Every generated chapter imports helpers.typ so symbols like toprule()
        // and any future shared helpers are in scope inside the included module.
        const prelude = '#import "helpers.typ": *\n\n'

        return `${prelude}${body}\n`
    } finally {
        knownChapterAnchors = null
        skipFootnoteRegexes = null
    }
}

function collectSkipFootnoteRegexes(markdown: string): RegExp[] {
    const regexes: RegExp[] = []
    const directive = /<!--\s*typ-no-link-footnote\s*:\s*([\s\S]*?)\s*-->/gi
    let m: RegExpExecArray | null
    while ((m = directive.exec(markdown)) !== null) {
        const pattern = m[1].trim()
        if (!pattern) continue
        try {
            regexes.push(new RegExp(pattern, "i"))
        } catch (err) {
            console.error(`typ-no-link-footnote: invalid regex ${JSON.stringify(pattern)}: ${(err as Error).message}`)
        }
    }
    return regexes
}

function normalizeMarkdown(markdown: string): string {
    const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, (match) => {
        if (/^<!--\s*typ-(columns|figure|no-link-footnote)\s*:/i.test(match)) {
            return match
        }
        return ""
    })
    const withCrossreferences = withoutComments.replace(/<crossreference\b[^>]*>([\s\S]*?)<\/crossreference>/gi, (_match, inner: string) => {
        const content = inner.trim()
        if (!content) {
            return ""
        }

        const quoted = content
            .split("\n")
            .map((line) => `> ${line.trim()}`)
            .join("\n")

        return `\n${quoted}\n`
    })

    return withCrossreferences.replace(/<div\b[^>]*\bclass\s*=\s*["'][^"']*\bwarning\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, (_match, inner: string) => {
        const content = inner.trim()
        if (!content) {
            return ""
        }

        const quoted = content
            .split("\n")
            .map((line) => `> ${line.trim()}`)
            .join("\n")

        return `\n${quoted}\n`
    })
}

function renderBlocks(tokens: AnyToken[]): string {
    const out: string[] = []
    const progressionParts: string[] = []
    const warningParts: string[] = []
    let inProgression = false
    let inWarning = false
    let pendingColumnsHint: string | undefined
    let pendingFigureHint: string | undefined

    let i = 0
    while (i < tokens.length) {
        const token = tokens[i]
        const html = getHtmlToken(token)
        if (isProgressionStartTag(html)) {
            inProgression = true
            i += 1
            continue
        }
        if (isProgressionEndTag(html)) {
            inProgression = false
            const block = progressionParts.filter((part) => part.trim().length > 0).join("\n\n")
            progressionParts.length = 0
            if (block.trim().length > 0) {
                out.push(`#progression[\n${indent(block)}\n]`)
            }
            i += 1
            continue
        }
        if (isWarningStartTag(html)) {
            inWarning = true
            i += 1
            continue
        }
        if (inWarning && isWarningEndTag(html)) {
            inWarning = false
            const block = warningParts.filter((part) => part.trim().length > 0).join("\n\n")
            warningParts.length = 0
            if (block.trim().length > 0) {
                out.push(`#quote(block: true)[\n${indent(block)}\n]`)
            }
            i += 1
            continue
        }
        if (isDivStartTag(html) || isDivEndTag(html)) {
            i += 1
            continue
        }
        if (containsSvg(html)) {
            const parts: string[] = []
            for (const svg of splitTopLevelSvgs(html)) {
                const classes = getSvgClasses(svg)
                if (!classes.includes("frame")) {
                    parts.push(`#figure(image(bytes(${toTypstString(svg)})), kind: "siteswap", supplement: none)`)
                } else if (classes.includes("frame")) {
                    parts.push(`#box(image(bytes(${toTypstString(svg)}), width: .57in))`)
                }
            }
            if (parts.length > 0) {
                out.push(parts.join(" "))
            }
            i += 1
            continue
        }

        const colHint = parseColumnsHint(html)
        if (colHint !== undefined) {
            pendingColumnsHint = colHint
            i += 1
            continue
        }

        const figHint = parseFigureHint(html)
        if (figHint !== undefined) {
            pendingFigureHint = figHint
            i += 1
            continue
        }

        if (isSkipLinkFootnoteHint(html)) {
            i += 1
            continue
        }

        const tokenType = asString(token.type)
        if (tokenType === "space") {
            i += 1
            continue
        }

        let rendered: string
        let consumedTo = i
        if (tokenType === "table") {
            rendered = renderTable(token, pendingColumnsHint)
        } else if (tokenType === "paragraph") {
            const fig = tryRenderFigureParagraph(tokens, i, pendingFigureHint)
            if (fig !== null) {
                rendered = emitFigure(fig)
                consumedTo = fig.consumedThrough
            } else {
                rendered = renderBlockToken(token)
            }
        } else {
            rendered = renderBlockToken(token)
        }
        pendingColumnsHint = undefined
        pendingFigureHint = undefined

        if (rendered && rendered.trim().length > 0) {
            if (inProgression) {
                progressionParts.push(rendered)
            } else if (inWarning) {
                warningParts.push(rendered)
            } else {
                out.push(rendered)
            }
        }
        i = consumedTo + 1
    }

    if (inProgression) {
        const block = progressionParts.filter((part) => part.trim().length > 0).join("\n\n")
        if (block.trim().length > 0) {
            out.push(`#quote(block: true)[\n${indent(block)}\n]`)
        }
    }
    if (inWarning) {
        const block = warningParts.filter((part) => part.trim().length > 0).join("\n\n")
        if (block.trim().length > 0) {
            out.push(`#quote(block: true)[\n${indent(block)}\n]`)
        }
    }

    return out.filter((part) => part.trim().length > 0).join("\n\n")
}

function emitFigure(fig: FigureResult): string {
    if (fig.placement === "right") {
        return `#right_figure(${fig.figureExpr})`
    }
    if (fig.placement === "left") {
        return `#left_figure(${fig.figureExpr})`
    }
    return `#${fig.figureExpr}`
}

function renderBlockToken(token: AnyToken): string {
    const type = asString(token.type)

    switch (type) {
        case "space":
            return ""
        case "heading": {
            const depth = asNumber(token.depth, 1)
            const inline = renderInline(asTokens(token.tokens))
            return `#heading(level: ${depth + 1})[${inline}]`
        }
        case "paragraph": {
            return renderInline(asTokens(token.tokens))
        }
        case "text": {
            const nested = asTokens(token.tokens)
            if (nested.length > 0) {
                return renderInline(nested)
            }
            return escapeText(asString(token.text))
        }
        case "blockquote": {
            const inner = renderBlocks(asTokens(token.tokens))
            return `#quote(block: true)[\n${indent(inner)}\n]`
        }
        case "code": {
            const text = asString(token.text)
            const lang = asString(token.lang)
            const langArg = lang ? `, lang: ${toTypstString(lang)}` : ""
            return `#raw(${toTypstString(text)}, block: true${langArg})`
        }
        case "html": {
            const html = getHtmlToken(token)
            if (!html || isHtmlComment(html) || isProgressionStartTag(html) || isProgressionEndTag(html) || isWarningStartTag(html) || isWarningEndTag(html) || isDivStartTag(html) || isDivEndTag(html)) {
                return ""
            }
            return `#raw(${toTypstString(html)}, block: true)`
        }
        case "list": {
            return renderList(token)
        }
        case "table": {
            return renderTable(token)
        }
        case "hr": {
            //out.push(`#line(length: 100%)`)
            //ignore
            return ""
        }
        default: {
            // Keep unsupported blocks visible but harmless for now.
            const fallback = asString(token.raw) || asString(token.text)
            if (fallback) {
                return `#raw(${toTypstString(fallback)})`
            }
            return ""
        }
    }
}

function renderList(token: AnyToken): string {
    const ordered = Boolean(token.ordered)
    const marker = ordered ? "+" : "-"
    const items = asTokens(token.items)

    const lines = items.map((item) => {
        const bodyTokens = asTokens(item.tokens)
        if (bodyTokens.length === 0) {
            return `${marker} ${escapeText(asString(item.text))}`
        }

        const inlineTokens: AnyToken[] = []
        const blockTokens: AnyToken[] = []
        for (const child of bodyTokens) {
            const t = asString(child.type)
            if (t === "list" || t === "blockquote" || t === "code" || t === "table" || t === "heading" || t === "hr" || t === "paragraph") {
                blockTokens.push(child)
            } else {
                inlineTokens.push(child)
            }
        }

        const inlineText = renderInline(inlineTokens).trim()
        const blockParts = blockTokens.map((b) => {
            if (asString(b.type) === "paragraph") {
                return renderInline(asTokens(b.tokens)).trim()
            }
            return renderBlockToken(b)
        }).filter((p) => p.length > 0)

        const head = inlineText.length > 0 ? `${marker} ${inlineText}` : `${marker}`
        if (blockParts.length === 0) {
            return head
        }
        return [head, ...blockParts.map((p) => indent(p))].join("\n")
    })

    return lines.join("\n")
}

function renderTable(token: AnyToken, columnsHint?: string): string {
    const headerCells = asTokens(token.header)
    const rows = asTokens(token.rows)

    if (headerCells.length === 0 && rows.length === 0) {
        return ""
    }

    const bodyRows = rows.map((row) => asTokens(row))
    const allRows = hasTokens(headerCells) ? [headerCells, ...bodyRows] : bodyRows

    const columnCount = allRows.reduce((max, row) => Math.max(max, row.length), 0)
    if (columnCount === 0) {
        return ""
    }

    const hasHeader = headerCells.length > 0

    const headerBlocks: string[] = []
    for (let col = 0; col < columnCount; col += 1) {
        const cell = headerCells[col]
        const tokens = asTokens(cell?.tokens)
        const text = tokens.length > 0 ? renderInline(tokens) : escapeText(asString(cell?.text))
        const content = text.trim().length > 0 ? text : " "
        headerBlocks.push(`[${content}]`)
    }

    const cellBlocks: string[] = []
    for (const row of bodyRows) {
        for (let col = 0; col < columnCount; col += 1) {
            const cell = row[col]
            const tokens = asTokens(cell?.tokens)
            const text = tokens.length > 0 ? renderInline(tokens) : escapeText(asString(cell?.text))
            const content = text.trim().length > 0 ? text : " "
            cellBlocks.push(`[${content}]`)
        }
    }

    const columnsSpec = formatColumnsSpec(columnsHint, columnCount)

    const tableParts = [
        `columns: ${columnsSpec}`,
        "toprule()",
        hasHeader ? `table.header(\n${indent(headerBlocks.join(",\n"))}\n)` : "",
        hasHeader ? "midrule()" : "",
        ...cellBlocks,
        "bottomrule()",
    ].filter((part) => part.length > 0)

    return `#table(\n${indent(tableParts.join(",\n"))}\n)`
}

function parseColumnsHint(html: string): string | undefined {
    if (!html) {
        return undefined
    }
    const match = html.match(/^\s*<!--\s*typ-columns\s*:\s*([\s\S]*?)\s*-->\s*$/i)
    if (!match) {
        return undefined
    }
    return match[1].trim()
}

function parseFigureHint(html: string): string | undefined {
    if (!html) {
        return undefined
    }
    const match = html.match(/^\s*<!--\s*typ-figure\s*:\s*([\s\S]*?)\s*-->\s*$/i)
    if (!match) {
        return undefined
    }
    return match[1].trim()
}

function isSkipLinkFootnoteHint(html: string): boolean {
    if (!html) return false
    return /^\s*<!--\s*typ-no-link-footnote\s*:[\s\S]*?-->\s*$/i.test(html)
}

type FigureResult = {
    figureExpr: string
    placement: "right" | "left" | null
    consumedThrough: number
}

function tryRenderFigureParagraph(
    tokens: AnyToken[],
    i: number,
    hint: string | undefined,
): FigureResult | null {
    const paragraph = tokens[i]
    const inline = asTokens(paragraph.tokens)
    if (inline.length === 0 || asString(inline[0].type) !== "image") {
        return null
    }

    const imageToken = inline[0]
    const hintInfo = parseFigureHintInfo(hint)

    // Pattern A: [image, (whitespace text)..., em] in the same paragraph.
    if (inline.length >= 2) {
        const last = inline[inline.length - 1]
        const middle = inline.slice(1, inline.length - 1)
        if (asString(last.type) === "em" && middle.every(isWhitespaceText)) {
            return {
                figureExpr: buildFigureExpr(imageToken, asTokens(last.tokens), hintInfo.width),
                placement: hintInfo.placement,
                consumedThrough: i,
            }
        }
    }

    // Pattern B: lone image paragraph (possibly with trailing whitespace),
    // optionally followed by a paragraph that is just an em.
    const rest = inline.slice(1)
    if (rest.every(isWhitespaceText)) {
        const nextIdx = findNextNonSpaceIndex(tokens, i + 1)
        if (nextIdx !== -1) {
            const next = tokens[nextIdx]
            if (asString(next.type) === "paragraph") {
                const nextInline = asTokens(next.tokens)
                if (nextInline.length === 1 && asString(nextInline[0].type) === "em") {
                    return {
                        figureExpr: buildFigureExpr(imageToken, asTokens(nextInline[0].tokens), hintInfo.width),
                        placement: hintInfo.placement,
                        consumedThrough: nextIdx,
                    }
                }
            }
        }
        return {
            figureExpr: buildFigureExpr(imageToken, null, hintInfo.width),
            placement: hintInfo.placement,
            consumedThrough: i,
        }
    }

    return null
}

function buildFigureExpr(imageToken: AnyToken, captionTokens: AnyToken[] | null, width: string | null): string {
    const src = asString(imageToken.href)
    const alt = asString(imageToken.text)
    const parsed = parseImageAlt(alt)
    const kind = parsed.kind || inferImageKind(src)

    const imageArgs = [toTypstString(src)]
    if (width) {
        imageArgs.push(`width: ${width}`)
    }

    const figureArgs = [
        `image(${imageArgs.join(", ")})`,
        `kind: ${toTypstString(kind)}`,
        `supplement: none`,
    ]
    if (captionTokens && captionTokens.length > 0) {
        figureArgs.push(`caption: [${renderInline(captionTokens)}]`)
    }
    return `figure(${figureArgs.join(", ")})`
}

function parseFigureHintInfo(hint: string | undefined): { placement: "right" | "left" | null; width: string | null } {
    if (!hint) return { placement: null, width: null }
    let placement: "right" | "left" | null = null
    if (/\bright\b/i.test(hint)) placement = "right"
    else if (/\bleft\b/i.test(hint)) placement = "left"
    let width: string | null = null
    const wMatch = hint.match(/\bwidth\s*[:=]\s*(\S+)/i)
    if (wMatch) {
        width = wMatch[1]
    } else if (placement) {
        // Sensible default so `<!-- typ-figure: right -->` actually shrinks.
        width = "35%"
    }
    return { placement, width }
}

function isWhitespaceText(token: AnyToken): boolean {
    if (asString(token.type) !== "text") {
        return false
    }
    if (asTokens(token.tokens).length > 0) {
        return false
    }
    return /^\s*$/.test(asString(token.text))
}

function findNextNonSpaceIndex(tokens: AnyToken[], startIdx: number): number {
    for (let j = startIdx; j < tokens.length; j += 1) {
        if (asString(tokens[j].type) !== "space") {
            return j
        }
    }
    return -1
}

function isDivStartTag(html: string): boolean {
    if (!html) return false
    if (isWarningStartTag(html)) return false
    return /^\s*<div\b[^>]*>\s*$/i.test(html)
}

function isDivEndTag(html: string): boolean {
    if (!html) return false
    return /^\s*<\/div>\s*$/i.test(html)
}

function formatColumnsSpec(hint: string | undefined, columnCount: number): string {
    if (hint) {
        const widths = hint.split(/\s+/).filter((w) => w.length > 0)
        if (widths.length > 0) {
            return `(${widths.join(", ")})`
        }
    }
    return `${columnCount}`
}

function hasTokens(tokens: AnyToken[]): boolean {
    return tokens.length > 0
}

function renderInline(tokens: AnyToken[]): string {
    const out: string[] = []

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i]
        const type = asString(token.type)

        switch (type) {
            case "text": {
                const nested = asTokens(token.tokens)
                if (nested.length > 0) {
                    out.push(renderInline(nested))
                } else {
                    out.push(escapeText(asString(token.text)))
                }
                break
            }
            case "strong":
                out.push(`#strong[${renderInline(asTokens(token.tokens))}]`)
                break
            case "em":
                out.push(`#emph[${renderInline(asTokens(token.tokens))}]`)
                break
            case "codespan":
                out.push(`#raw(${toTypstString(asString(token.text))})`)
                break
            case "link": {
                const href = asString(token.href)
                const rawText = asString(token.text)
                const label = renderInline(asTokens(token.tokens)) || escapeText(href)

                const chapterAnchor = resolveChapterAnchor(href)
                if (chapterAnchor) {
                    out.push(`#link(<${chapterAnchor}>)[${label}]`)
                    break
                }

                const isExternal = /^https?:\/\//i.test(href)
                if (!isExternal) {
                    // Unknown internal link target (e.g., chapter not in SUMMARY,
                    // bare fragment) — drop the link and render the label only.
                    out.push(label)
                    break
                }

                out.push(`#link(${toTypstString(href)})[${label}]`)

                const skipFootnote = skipFootnoteRegexes?.some((re) => re.test(href)) ?? false
                if (!skipFootnote && !linkTextMatchesHref(rawText, href)) {
                    const footnote = `#footnote[${escapeText(href)}]`
                    const nextToken = tokens[i + 1]
                    const nextIsPlainText = nextToken
                        && asString(nextToken.type) === "text"
                        && asTokens(nextToken.tokens).length === 0
                    const nextText = nextIsPlainText ? asString(nextToken.text) : ""
                    const punctMatch = nextText.match(/^([.,;:!?)\]]+)([\s\S]*)$/)

                    if (punctMatch) {
                        out.push(escapeText(punctMatch[1]))
                        out.push(footnote)
                        if (punctMatch[2].length > 0) {
                            out.push(escapeText(punctMatch[2]))
                        }
                        i += 1
                    } else {
                        out.push(footnote)
                    }
                }
                break
            }
            case "br":
                out.push(`\\`)
                break
            case "del":
                out.push(`#strike[${renderInline(asTokens(token.tokens))}]`)
                break
            case "image": {
                const src = asString(token.href)
                const alt = asString(token.text)
                const parsed = parseImageAlt(alt)
                if (parsed.kind === "frame") {
                    out.push(`#box(image(${toTypstString(src)}, width: .57in))`)
                    break
                }
                const kind = parsed.kind || inferImageKind(src)
                const figureArgs = [
                    `image(${toTypstString(src)})`,
                    `kind: ${toTypstString(kind)}`,
                    `supplement: none`,
                ]
                // if (parsed.caption) {
                //     figureArgs.push(`caption: [${escapeText(parsed.caption)}]`)
                // }
                const fig = `figure(${figureArgs.join(", ")})`
                out.push("#" + /*(parsed.kind === "patternWithFrames" ? `box(${fig})` :*/ fig)//)
                break
            }
            case "html": {
                const html = asString(token.raw) || asString(token.text)
                if (html && !isHtmlComment(html) && !isProgressionStartTag(html) && !isProgressionEndTag(html) && !isWarningStartTag(html) && !isWarningEndTag(html)) {
                    out.push(`#raw(${toTypstString(html)})`)
                }
                break
            }
            default: {
                const fallback = asString(token.raw) || asString(token.text)
                if (fallback) {
                    out.push(`#raw(${toTypstString(fallback)})`)
                }
                break
            }
        }
    }

    return out.join("")
}

function resolveChapterAnchor(href: string): string | null {
    if (!href) return null
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null
    if (href.startsWith("#")) return null

    const withoutFragment = href.split("#")[0].split("?")[0]
    const match = withoutFragment.match(/^(?:\.\/)?(?:[^?#]*\/)?([^/?#]+)\.md$/i)
    if (!match) return null

    const safe = match[1].toLowerCase().replace(/[^a-z0-9_-]/g, "-")
    if (!safe) return null
    const anchor = `ch-${safe}`
    if (knownChapterAnchors && !knownChapterAnchors.has(anchor)) {
        return null
    }
    return anchor
}

function linkTextMatchesHref(text: string, href: string): boolean {
    return normalizeUrlForCompare(text) === normalizeUrlForCompare(href)
}

function normalizeUrlForCompare(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/+$/, "")
}

function escapeText(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll("*", "\\*")
        .replaceAll("$", "\\$")
        .replaceAll("#", "\\#")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
}

function toTypstString(value: string): string {
    return JSON.stringify(value)
}

function indent(text: string): string {
    if (!text.trim()) {
        return ""
    }
    return text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
}

function asTokens(value: unknown): AnyToken[] {
    return Array.isArray(value) ? (value as AnyToken[]) : []
}

function asString(value: unknown, defaultValue = ""): string {
    return typeof value === "string" ? value : defaultValue
}

function asNumber(value: unknown, defaultValue: number): number {
    return typeof value === "number" ? value : defaultValue
}

function getHtmlToken(token: AnyToken): string {
    return asString(token.raw) || asString(token.text)
}

function isHtmlComment(html: string): boolean {
    return /^\s*<!--[\s\S]*?-->\s*$/m.test(html)
}

function isProgressionStartTag(html: string): boolean {
    return /^\s*<progressions?\b[^>]*>\s*$/i.test(html)
}

function isProgressionEndTag(html: string): boolean {
    return /^\s*<\/progressions?>\s*$/i.test(html)
}

function isWarningStartTag(html: string): boolean {
    return /^\s*<div\b[^>]*\bclass\s*=\s*["'][^"']*\bwarning\b[^"']*["'][^>]*>\s*$/i.test(html)
}

function isWarningEndTag(html: string): boolean {
    return /^\s*<\/div>\s*$/i.test(html)
}

function parseImageAlt(alt: string): { kind: string; caption: string } {
    const trimmed = alt.trim()
    if (!trimmed) {
        return { kind: "", caption: "" }
    }

    // Syntax: ![tag:sync-group | optional caption](path)
    const tagged = trimmed.match(/^tag:([a-zA-Z0-9_-]+)(?:\s*\|\s*(.*))?$/)
    if (tagged) {
        return {
            kind: tagged[1],
            caption: (tagged[2] || "").trim(),
        }
    }

    return { kind: "", caption: trimmed }
}

function inferImageKind(src: string): string {
    const generatedKind = inferGeneratedSiteswapvisKind(src)
    if (generatedKind) {
        return generatedKind
    }
    return "plain"
}

function inferGeneratedSiteswapvisKind(src: string): string {
    const m = src.match(/^siteswapvis\/([a-z][a-z-]*)-\d+\.svg$/i)
    return m ? m[1].toLowerCase() : ""
}

if (import.meta.main) {
    const markdown = await new Response(Deno.stdin.readable).text()
    const typst = mdToTypst(markdown)
    await Deno.stdout.write(new TextEncoder().encode(typst))
}

function containsSvg(html: string): boolean {
    return /<svg\b[^>]*>[\s\S]*?<\/svg>/i.test(html)
}

function splitTopLevelSvgs(html: string): string[] {
    const out: string[] = []
    const re = /<svg\b|<\/svg>/gi
    let depth = 0
    let start = -1
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
        if (m[0].toLowerCase() === "</svg>") {
            if (depth > 0 && --depth === 0) {
                out.push(html.slice(start, m.index + m[0].length))
                start = -1
            }
        } else {
            if (depth === 0) start = m.index
            depth++
        }
    }
    return out
}

function getSvgClasses(svg: string): string[] {
    const m = svg.match(/^\s*<svg\b[^>]*\bclass\s*=\s*["']([^"']*)["']/i)
    if (!m) return []
    return m[1].trim().split(/\s+/).filter((cls) => cls.length > 0)
}
