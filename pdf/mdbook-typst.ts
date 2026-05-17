/**
 * mdBook preprocessor that converts chapter Markdown to Typst-like markup.
 *
 * This currently performs a straightforward conversion through `mdToTypst`.
 */

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { mdToTypst } from "./md2typ.ts"
import { renderSiteswapElements } from "../vizsiteswap/siteswapvis/render-siteswap-elements.ts"

// mdBook probes preprocessors with: <command> supports <renderer>
if (process.argv[2] === "supports") {
    process.exit(0)
}

const file = fs.readFileSync(0, "utf-8")
const parsed = JSON.parse(file)
const context = extractContext(parsed)
const book = extractBook(parsed)

const outputDir = resolveOutputDir()
fs.mkdirSync(outputDir, { recursive: true })
copyTemplateTyp(outputDir)
copyHelpersTyp(outputDir)

const figuresSource = resolveFiguresSource(context)
if (figuresSource) {
    const figuresTarget = path.join(outputDir, "figures")
    if (isSameDirectory(figuresSource, figuresTarget)) {
        console.error(`mdbook-typst skipping figures copy (source equals target): ${figuresSource}`)
    } else {
        fs.cpSync(figuresSource, figuresTarget, { recursive: true })
        console.error(`mdbook-typst copied figures from ${figuresSource} to ${figuresTarget}`)
    }
} else {
    console.error("mdbook-typst did not find a figures directory to copy")
}

let chapterCount = 0
let renderedSvgCount = 0
const mainContentFiles: { file: string; sourcePath: string }[] = []
let frontmatterFile = ""
const svgOutputDir = path.join(outputDir, "siteswapvis")
fs.mkdirSync(svgOutputDir, { recursive: true })
const partByChapter = loadPartMapping(context)

const knownChapters = new Set<string>()
forEachChapter(book, (chapter) => {
    const anchor = chapterAnchorName(chapter)
    if (anchor) {
        knownChapters.add(anchor)
    }
})

forEachChapter(book, (chapter) => {
    if (typeof chapter.content !== "string") {
        return
    }
    chapterCount++
    const isFrontmatter = isFrontmatterChapter(chapter)

    const rendered = renderSiteswapElements(chapter.content, {
        mode: "markdown-image",
        renderGroupInitScript: false,
        writeSvgFile: (svg, kind) => {
            renderedSvgCount++
            const filename = `${kind}-${renderedSvgCount.toString().padStart(4, "0")}.svg`
            const filepath = path.join(svgOutputDir, filename)
            fs.writeFileSync(filepath, svg, "utf-8")
            return `siteswapvis/${filename}`
        },
        formatVideoLink: (url) => `Video: [${url}](${url})`,
    })

    let markdownContent = rendered.content
    if (isFrontmatter) {
        markdownContent = truncateAtMarkdownSeparator(markdownContent)
        markdownContent = stripLeadingMarkdownTitle(markdownContent)
    }
    chapter.content = mdToTypst(markdownContent, { knownChapters })

    const anchorName = chapterAnchorName(chapter)
    if (anchorName) {
        const anchorLine = `#metadata("chapter") <${anchorName}>\n\n`
        const importMatch = chapter.content.match(/^(#import [^\n]*\n+)/)
        if (importMatch) {
            chapter.content = chapter.content.slice(0, importMatch[0].length)
                + anchorLine
                + chapter.content.slice(importMatch[0].length)
        } else {
            chapter.content = anchorLine + chapter.content
        }
    }

    const outputFile = chapterFileName(chapter, chapterCount)
    const outputPath = path.join(outputDir, outputFile)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, chapter.content, "utf-8")

    if (isFrontmatter) {
        frontmatterFile = outputFile
    } else {
        mainContentFiles.push({ file: outputFile, sourcePath: asString(chapter.source_path) })
    }
})

const frontmatterPath = path.join(outputDir, "frontmatter.typ")
const frontmatter = frontmatterFile ? `#include ${JSON.stringify(frontmatterFile)}\n` : ""
fs.writeFileSync(frontmatterPath, frontmatter, "utf-8")

const mainContentPath = path.join(outputDir, "maincontent.typ")
const mainContent = buildMainContent(mainContentFiles, partByChapter)
fs.writeFileSync(mainContentPath, mainContent, "utf-8")

console.error(`mdbook-typst converted ${chapterCount} chapters`)
console.error(`mdbook-typst rendered ${renderedSvgCount} siteswap SVGs to ${svgOutputDir}`)
console.error(`mdbook-typst wrote ${mainContentFiles.length + (frontmatterFile ? 1 : 0)} chapter files to ${outputDir}`)
console.error(`mdbook-typst wrote frontmatter file ${frontmatterPath}`)
console.error(`mdbook-typst wrote main content file ${mainContentPath}`)

function buildMainContent(entries: { file: string; sourcePath: string }[], partByChapter: Map<string, string>): string {
    const lines: string[] = []
    let currentPart = ""

    for (const entry of entries) {
        const chapterKey = normalizeSummaryPath(entry.sourcePath)
        const part = partByChapter.get(chapterKey) || ""
        if (part && part !== currentPart) {
            currentPart = part
            lines.push(`#heading(level: 1)[${escapeTypstText(part)}]`)
        }
        lines.push(`#include ${JSON.stringify(entry.file)}`)
    }

    lines.push("")
    return lines.join("\n")
}

function loadPartMapping(context: Record<string, unknown>): Map<string, string> {
    const summaryPath = resolveSummaryPath(context)
    if (!summaryPath || !fs.existsSync(summaryPath)) {
        return new Map<string, string>()
    }
    const summary = fs.readFileSync(summaryPath, "utf-8")
    return parseSummaryPartMapping(summary)
}

function resolveSummaryPath(context: Record<string, unknown>): string | null {
    const root = asString(context.root)
    const srcDir = resolveBookSrc(context)
    const candidates = [
        root && srcDir ? path.join(root, srcDir, "SUMMARY.md") : "",
        path.join(process.cwd(), "SUMMARY.md"),
        path.join(process.cwd(), "..", "src", "SUMMARY.md"),
        path.join(process.cwd(), "..", "..", "src", "SUMMARY.md"),
    ].filter((candidate) => candidate.length > 0)

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate
        }
    }
    return null
}

function parseSummaryPartMapping(summary: string): Map<string, string> {
    const mapping = new Map<string, string>()
    let currentPart = ""

    for (const line of summary.split("\n")) {
        const heading = line.match(/^#\s+(.+)$/)
        if (heading) {
            currentPart = heading[1].trim()
            continue
        }

        const item = line.match(/^\s*-\s*\[[^\]]*\]\(([^)]+)\)/)
        if (!item) {
            continue
        }

        const link = item[1].trim()
        if (!link || link.startsWith("http://") || link.startsWith("https://") || link.startsWith("#")) {
            continue
        }

        const chapterPath = normalizeSummaryPath(link)
        if (chapterPath.endsWith(".md") && chapterPath.length > 0 && currentPart.length > 0) {
            mapping.set(chapterPath, currentPart)
        }
    }

    return mapping
}

function normalizeSummaryPath(p: string): string {
    const withoutAnchor = p.split("#", 1)[0]
    return withoutAnchor.replace(/^\.\//, "").replace(/^\//, "").trim().toLowerCase()
}

function escapeTypstText(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll("#", "\\#")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
}

function extractContext(rawInput: unknown): Record<string, unknown> {
    if (Array.isArray(rawInput) && rawInput.length >= 1 && rawInput[0] && typeof rawInput[0] === "object") {
        return rawInput[0] as Record<string, unknown>
    }
    if (rawInput && typeof rawInput === "object" && "context" in rawInput) {
        const context = (rawInput as { context: unknown }).context
        if (context && typeof context === "object") {
            return context as Record<string, unknown>
        }
    }
    return {}
}

function resolveOutputDir(): string {
    return process.cwd()
}

function copyTemplateTyp(outputDir: string): void {
    const localTemplate = path.resolve(process.cwd(), "template.typ")
    const repoTemplate = path.resolve(process.cwd(), "..", "..", "pdf", "template.typ")
    const source = fs.existsSync(localTemplate) ? localTemplate : repoTemplate
    const target = path.join(outputDir, "main.typ")

    if (isSameFile(source, target)) {
        console.error(`mdbook-typst using existing template ${target}`)
        return
    }

    fs.copyFileSync(source, target)
    console.error(`mdbook-typst copied template from ${source} to ${target}`)
}

function copyHelpersTyp(outputDir: string): void {
    const localHelpers = path.resolve(process.cwd(), "helpers.typ")
    const repoHelpers = path.resolve(process.cwd(), "..", "..", "pdf", "helpers.typ")
    const source = fs.existsSync(localHelpers) ? localHelpers : repoHelpers
    const target = path.join(outputDir, "helpers.typ")

    if (isSameFile(source, target)) {
        console.error(`mdbook-typst using existing helpers ${target}`)
        return
    }

    fs.copyFileSync(source, target)
    console.error(`mdbook-typst copied helpers from ${source} to ${target}`)
}

function isFrontmatterChapter(chapter: ChapterNode): boolean {
    const sourcePath = asString(chapter.source_path).toLowerCase()
    return sourcePath.endsWith("introduction.md")
}

function truncateAtMarkdownSeparator(markdown: string): string {
    const lines = markdown.split("\n")
    const separatorLine = lines.findIndex((line) => /^\s*---\s*$/.test(line))
    if (separatorLine === -1) {
        return markdown
    }
    return lines.slice(0, separatorLine).join("\n")
}

function stripLeadingMarkdownTitle(markdown: string): string {
    const lines = markdown.split("\n")
    let idx = 0

    while (idx < lines.length && lines[idx].trim().length === 0) {
        idx++
    }

    if (idx < lines.length && /^#\s+/.test(lines[idx])) {
        idx++
        while (idx < lines.length && lines[idx].trim().length === 0) {
            idx++
        }
        return lines.slice(idx).join("\n")
    }

    return markdown
}

function isSameFile(a: string, b: string): boolean {
    const resolvedA = resolvePathForCompare(a)
    const resolvedB = resolvePathForCompare(b)
    return resolvedA === resolvedB
}

function resolveFiguresSource(context: Record<string, unknown>): string | null {
    const root = asString(context.root)
    const srcDir = resolveBookSrc(context)
    const candidates = [
        root && srcDir ? path.join(root, srcDir, "figures") : "",
        path.join(process.cwd(), "figures"),
        path.join(process.cwd(), "..", "src", "figures"),
        path.join(process.cwd(), "..", "..", "src", "figures"),
    ].filter((candidate) => candidate.length > 0)

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate
        }
    }

    return null
}

function resolveBookSrc(context: Record<string, unknown>): string {
    const config = asRecord(context.config)
    const book = asRecord(config.book)
    const src = asString(book.src)
    return src || "src"
}

function isSameDirectory(a: string, b: string): boolean {
    const resolvedA = resolvePathForCompare(a)
    const resolvedB = resolvePathForCompare(b)
    return resolvedA === resolvedB
}

function resolvePathForCompare(p: string): string {
    const absolute = path.resolve(p)
    try {
        return fs.realpathSync(absolute)
    } catch {
        return absolute
    }
}

function chapterAnchorName(chapter: ChapterNode): string {
    const sourcePath = asString(chapter.source_path)
    if (!sourcePath) return ""
    const base = path.basename(sourcePath).replace(/\.md$/i, "")
    const safe = base.toLowerCase().replace(/[^a-z0-9_-]/g, "-")
    return safe ? `ch-${safe}` : ""
}

function chapterFileName(chapter: ChapterNode, index: number): string {
    const sourcePath = asString(chapter.source_path)
    if (sourcePath) {
        const baseName = sourcePath.replace(/\.md$/i, "")
        const safeName = baseName.replace(/[^a-zA-Z0-9._/-]/g, "-")
        return `${safeName}.typ`
    }
    return `chapter-${index.toString().padStart(3, "0")}.typ`
}

function extractBook(rawInput: unknown): unknown {
    if (Array.isArray(rawInput) && rawInput.length >= 2) {
        return rawInput[1]
    }
    if (rawInput && typeof rawInput === "object" && "book" in rawInput) {
        return (rawInput as { book: unknown }).book
    }
    return rawInput
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : ""
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

type ChapterNode = {
    content?: string
    source_path?: string
    [key: string]: unknown
}

function forEachChapter(node: unknown, callback: (chapter: ChapterNode) => void): void {
    if (Array.isArray(node)) {
        for (const item of node) {
            forEachChapter(item, callback)
        }
        return
    }
    if (!node || typeof node !== "object") {
        return
    }

    const record = node as Record<string, unknown>
    if (record.Chapter && typeof record.Chapter === "object") {
        callback(record.Chapter as ChapterNode)
    }

    for (const value of Object.values(record)) {
        if (value && typeof value === "object") {
            forEachChapter(value, callback)
        }
    }
}
