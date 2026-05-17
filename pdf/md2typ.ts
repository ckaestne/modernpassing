import { marked } from "npm:marked"

type AnyToken = Record<string, unknown>

export function mdToTypst(markdown: string): string {
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
}

function normalizeMarkdown(markdown: string): string {
    const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, (match) => {
        if (/^<!--\s*typ-columns\s*:/i.test(match)) {
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

    for (const token of tokens) {
        const html = getHtmlToken(token)
        if (isProgressionStartTag(html)) {
            inProgression = true
            continue
        }
        if (isProgressionEndTag(html)) {
            inProgression = false
            const block = progressionParts.filter((part) => part.trim().length > 0).join("\n\n")
            progressionParts.length = 0
            if (block.trim().length > 0) {
                out.push(`#quote(block: true)[\nPattern progression:\n\n${indent(block)}\n]`)
            }
            continue
        }
        if (isWarningStartTag(html)) {
            inWarning = true
            continue
        }
        if (inWarning && isWarningEndTag(html)) {
            inWarning = false
            const block = warningParts.filter((part) => part.trim().length > 0).join("\n\n")
            warningParts.length = 0
            if (block.trim().length > 0) {
                out.push(`#quote(block: true)[\n${indent(block)}\n]`)
            }
            continue
        }

        const hint = parseColumnsHint(html)
        if (hint !== undefined) {
            pendingColumnsHint = hint
            continue
        }

        const tokenType = asString(token.type)
        if (tokenType === "space") {
            continue
        }

        let rendered: string
        if (tokenType === "table") {
            rendered = renderTable(token, pendingColumnsHint)
        } else {
            rendered = renderBlockToken(token)
        }
        pendingColumnsHint = undefined

        if (!rendered || rendered.trim().length === 0) {
            continue
        }

        if (inProgression) {
            progressionParts.push(rendered)
        } else if (inWarning) {
            warningParts.push(rendered)
        } else {
            out.push(rendered)
        }
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
            if (!html || isHtmlComment(html) || isProgressionStartTag(html) || isProgressionEndTag(html) || isWarningStartTag(html) || isWarningEndTag(html)) {
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

        const oneLine = renderInline(bodyTokens).trim()
        return `${marker} ${oneLine}`
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

    for (const token of tokens) {
        const type = asString(token.type)

        switch (type) {
            case "text":
                out.push(escapeText(asString(token.text)))
                break
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
                const label = renderInline(asTokens(token.tokens)) || escapeText(href)
                out.push(`#link(${toTypstString(href)})[${label}]`)
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
                const kind = parsed.kind || inferImageKind(src)
                const figureArgs = [
                    `image(${toTypstString(src)})`,
                    `kind: ${toTypstString(kind)}`,
                    `supplement: none`,
                ]
                // if (parsed.caption) {
                //     figureArgs.push(`caption: [${escapeText(parsed.caption)}]`)
                // }
                out.push(`#figure(${figureArgs.join(", ")})`)
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

function escapeText(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll("*", "\\*")
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
