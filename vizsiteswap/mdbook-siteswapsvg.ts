/**
 * mdbook preprocessor to replace <siteswap> <siteswap-group> <sync> <sync-group> and <positions>
 * (each possibly with a style attribute parsed as JSON for rendererConfig/renderLayoutConfig/SiteswapPatternConfig)
 * with inline SVG images (and sometimes some javascript for animations)
 */

import { createGroupPattern, createSiteswapPattern, createSyncPattern } from "@modernpassing/parsing"
import { renderGroupPattern, renderPlainPattern } from "@modernpassing/rendering-svg"
import { assert } from "node:console"
import fs from "node:fs"
import process from "node:process"
import { replaceElement } from "./replace-util.ts"

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
            chapter.content = replaceElement("siteswap", chapter.content, (_match, inner, config) => {
                nrPatterns[0]++
                const pattern = createSiteswapPattern(inner, config)
                if (!pattern.isValid()) {
                    console.error(`Invalid siteswap: ${inner}: \n${pattern.getValidationError()}`)
                    process.exit(1)
                }
                const svg = renderPlainPattern(pattern, config)
                return svg.svg()
            })
            chapter.content = replaceElement("sync", chapter.content, (_match, p, config) => {
                nrPatterns[1]++
                const pattern = createSyncPattern(p)
                if (!pattern.isValid()) {
                    console.error(`Invalid siteswap: ${p}: \n${pattern.getValidationError()}`)
                    process.exit(1)
                }
                const svg = renderPlainPattern(pattern, config)
                return svg.svg()
            })
            //sync-group
            chapter.content = replaceElement("sync-group", chapter.content, (_match, p, config, videoLinks) => {
                return handleGroupPattern(p, 2, config, videoLinks)
            })
            chapter.content = replaceElement("siteswap-group", chapter.content, (_match, p, config, videoLinks) => {
                return handleGroupPattern(p, 4, config, videoLinks)
            })
            // sec.Chapter.content = replaceElement("positions", sec.Chapter.content, (match, p, config) => {
            //     nrPatterns[1]++
            //     const layout = createLayout(p)
            //     const svg = renderStaticLayout(layout.static, 148, 148, config);
            //     return svg.svg();
            // });
            chapter.content = replaceElement("video", chapter.content, (_match, p, _config) => {
                return `<crossreference>Video: <a href="${p}" target="_blank">${p}</a></crossreference>`
            })
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

type GroupRenderConfig = Parameters<typeof renderGroupPattern>[1]

function handleGroupPattern(p: string, nrHands: number, config: GroupRenderConfig, videoLinks: string[]): string {
    assert(nrHands === 2 || nrHands === 4, "Only 2 or 4 hands supported for group patterns")
    nrPatterns[2]++
    let result = ""
    const gp = createGroupPattern(p, nrHands)
    gp.videoLinks = videoLinks

    try {
        // if (!config.renderFramesOnly) {
        const [svg, initData] = renderGroupPattern(gp, config)
        result = svg.svg() + `\n<script>window.addEventListener("load",function(){initializeFromData(${JSON.stringify(initData)})\n})\n</script>`
        // } else {
        //     const frames = renderLayoutFrames(pattern.layout!.frames!, 148, 148, config);
        //     result = '<div class="group-pattern-frames">'
        //         + frames.map((f) => f.svg()).join("\n")
        //         + '</div>'
        // }
    } catch (e) {
        console.error(`Error rendering syncgroup ${p}: ${e}\n${(e as Error).stack}`)
        result = `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
    }
    return result
}

const endTime = Date.now()
const elapsedTime = endTime - startTime
console.error(`mdbook-siteswapsvg processed ${nrPatterns[1]} sync, ${nrPatterns[0]} siteswap, and ${nrPatterns[2]} group patterns in ${elapsedTime} milliseconds`)

console.log(JSON.stringify(book))
