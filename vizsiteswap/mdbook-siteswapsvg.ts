/**
 * mdbook preprocessor to replace <siteswap> <siteswap-group> <sync> <sync-group> and <positions>
 * (each possibly with a style attribute parsed as JSON for rendererConfig/renderLayoutConfig/SiteswapPatternConfig)
 * with inline SVG images (and sometimes some javascript for animations)
 */

import fs from "node:fs"
import process from "node:process"
import { renderSiteswapElements } from "./siteswapvis/render-siteswap-elements.ts"

// handling of mdbook specific protocol
if (process.argv[2] === "supports") {
    process.exit(process.argv.includes("html") ? 0 : 1)
}

const file = fs.readFileSync(0, "utf-8")

fs.writeFileSync("tmp_mdbook.json", file)
const book = extractBook(JSON.parse(file))

const startTime = Date.now()
const nrPatterns = [0, 0, 0]
forEachChapter(book, (chapter) => {
    try {
        if (typeof chapter.content === "string") {
            const result = renderSiteswapElements(chapter.content, {
                mode: "html:inline-svg+js",
                renderGroupInitScript: true,
                formatVideoLink: (url) => `<crossreference>Video: <a href="${url}" target="_blank">${url}</a></crossreference>`,
            })

            chapter.content = result.content
            nrPatterns[0] += result.stats.siteswap
            nrPatterns[1] += result.stats.sync
            nrPatterns[2] += result.stats.group
        }
    } catch (e) {
        console.error(`Error processing section ${chapter.source_path}`)
        throw e
    }
})

function extractBook(rawInput: unknown): unknown {
    if (Array.isArray(rawInput) && rawInput.length >= 2) {
        return rawInput[1]
    }
    if (rawInput && typeof rawInput === "object" && "book" in rawInput) {
        return (rawInput as { book: unknown }).book
    }
    return rawInput
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

const endTime = Date.now()
const elapsedTime = endTime - startTime
console.error(`mdbook-siteswapsvg processed ${nrPatterns[1]} sync, ${nrPatterns[0]} siteswap, and ${nrPatterns[2]} group patterns in ${elapsedTime} milliseconds`)

console.log(JSON.stringify(book))
