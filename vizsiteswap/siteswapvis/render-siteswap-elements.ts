import { createGroupPattern, createSiteswapPattern, createSyncPattern } from "@modernpassing/parsing"
import { renderGroupPattern, renderPlainPattern } from "@modernpassing/rendering-svg"
import { assert } from "node:console"
import { replaceElement } from "../replace-util.ts"

type GroupRenderConfig = Parameters<typeof renderGroupPattern>[1]

type RenderKind = "siteswap" | "sync" | "group"

export type RenderStats = {
    siteswap: number
    sync: number
    group: number
}

type RenderMode = "html" | "markdown-image"

type RenderSiteswapElementsOptions = {
    mode: RenderMode
    renderGroupInitScript?: boolean
    writeSvgFile?: (svg: string, kind: RenderKind, index: number) => string
    formatVideoLink?: (url: string) => string
}

type RenderSiteswapElementsResult = {
    content: string
    stats: RenderStats
}

export function renderSiteswapElements(content: string, options: RenderSiteswapElementsOptions): RenderSiteswapElementsResult {
    const stats: RenderStats = { siteswap: 0, sync: 0, group: 0 }
    let contentWithSvgs = content

    contentWithSvgs = replaceElement("siteswap", contentWithSvgs, (_match, inner, config) => {
        stats.siteswap++
        const pattern = createSiteswapPattern(inner, config)
        if (!pattern.isValid()) {
            throw new Error(`Invalid siteswap: ${inner}: \n${pattern.getValidationError()}`)
        }
        const svg = renderPlainPattern(pattern, config)
        return renderOutput(svg.svg(), "siteswap", stats.siteswap, options)
    })

    contentWithSvgs = replaceElement("sync", contentWithSvgs, (_match, p, config) => {
        stats.sync++
        const pattern = createSyncPattern(p)
        if (!pattern.isValid()) {
            throw new Error(`Invalid sync siteswap: ${p}: \n${pattern.getValidationError()}`)
        }
        const svg = renderPlainPattern(pattern, config)
        return renderOutput(svg.svg(), "sync", stats.sync, options)
    })

    contentWithSvgs = replaceElement("sync-group", contentWithSvgs, (_match, p, config, videoLinks) => {
        stats.group++
        return renderGroup(p, 2, config, videoLinks, stats.group, options)
    })

    contentWithSvgs = replaceElement("siteswap-group", contentWithSvgs, (_match, p, config, videoLinks) => {
        stats.group++
        return renderGroup(p, 4, config, videoLinks, stats.group, options)
    })

    contentWithSvgs = replaceElement("video", contentWithSvgs, (_match, p) => {
        if (options.formatVideoLink) {
            return options.formatVideoLink(p)
        }
        return `Video: ${p}`
    })

    return { content: contentWithSvgs, stats }
}

function renderGroup(p: string, nrHands: number, config: GroupRenderConfig, videoLinks: string[], index: number, options: RenderSiteswapElementsOptions): string {
    assert(nrHands === 2 || nrHands === 4, "Only 2 or 4 hands supported for group patterns")
    const gp = createGroupPattern(p, nrHands)
    gp.videoLinks = videoLinks

    try {
        const [svg, initData] = renderGroupPattern(gp, config)
        const svgContent = svg.svg()

        if (options.mode === "html" && options.renderGroupInitScript !== false) {
            return svgContent + `\n<script>window.addEventListener("load",function(){initializeFromData(${JSON.stringify(initData)})\n})\n</script>`
        }

        return renderOutput(svgContent, "group", index, options)
    } catch (e) {
        return `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
    }
}

function renderOutput(svg: string, kind: RenderKind, index: number, options: RenderSiteswapElementsOptions): string {
    if (options.mode === "html") {
        return svg
    }
    if (!options.writeSvgFile) {
        throw new Error("renderSiteswapElements requires writeSvgFile in markdown-image mode")
    }
    const filename = options.writeSvgFile(svg, kind, index)
    return `![](${filename})`
}
