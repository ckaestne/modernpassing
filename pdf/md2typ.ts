import { marked } from "npm:marked"

type AnyToken = Record<string, unknown>

export function mdToTypst(markdown: string): string {
    const normalizedMarkdown = normalizeMarkdown(markdown)

    const tokens = marked.lexer(normalizedMarkdown, {
        gfm: true,
        breaks: false,
    }) as unknown as AnyToken[]

    const body = renderBlocks(tokens).trim()
    return body.length > 0 ? `${body}\n` : ""
}

function normalizeMarkdown(markdown: string): string {
    const withoutComments = markdown.replace(/<!--[\s\S]*?-->/g, "")
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

        const rendered = renderBlockToken(token)
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
                const alt = escapeText(asString(token.text))
                out.push(`#figure(image(${toTypstString(src)}))`)
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

if (import.meta.main) {
    const markdown = await new Response(Deno.stdin.readable).text()
    const typst = mdToTypst(markdown)
    await Deno.stdout.write(new TextEncoder().encode(typst))
}
