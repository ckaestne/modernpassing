import { createGroupPattern, createSiteswapPattern, createSyncPattern } from "@modernpassing/parsing"
import { type AnyRendererConfig, mergePartialConfig, renderAnimationFrameAsSvg, renderGroupPattern, RenderLayoutConfig, renderPlainPattern, type FrameRenderConfig } from "@modernpassing/rendering-svg"
import { type RendererConfig } from "@modernpassing/rendering-core"
import { assert } from "node:console"
import { replaceElement } from "../replace-util.ts"



type RenderKind = "siteswap" | "sync" | "sync-group" | "siteswap-group" | "frame"

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

export function renderSiteswapElements(content: string, options: RenderSiteswapElementsOptions, renderingDefaultsConfig: Partial<RendererConfig & RenderLayoutConfig & FrameRenderConfig> = {}): RenderSiteswapElementsResult {
    const stats: RenderStats = { siteswap: 0, sync: 0, group: 0 }
    let contentWithSvgs = content

    contentWithSvgs = replaceElement("siteswap", contentWithSvgs, (_match, inner, config) => {
        stats.siteswap++
        const pattern = createSiteswapPattern(inner, config)
        if (!pattern.isValid()) {
            throw new Error(`Invalid siteswap: ${inner}: \n${pattern.getValidationError()}`)
        }
        const svg = renderPlainPattern(pattern, mergePartialConfig(renderingDefaultsConfig, config))
        return renderOutput(svg.svg(), "siteswap", stats.siteswap, options)
    })

    contentWithSvgs = replaceElement("sync", contentWithSvgs, (_match, p, config) => {
        stats.sync++
        const pattern = createSyncPattern(p)
        if (!pattern.isValid()) {
            throw new Error(`Invalid sync siteswap: ${p}: \n${pattern.getValidationError()}`)
        }
        const svg = renderPlainPattern(pattern, mergePartialConfig(renderingDefaultsConfig, config))
        return renderOutput(svg.svg(), "sync", stats.sync, options)
    })

    contentWithSvgs = replaceElement("sync-group", contentWithSvgs, (_match, p, config, videoLinks, attrs) => {
        stats.group++
        return renderGroup(p, 2, "sync-group", mergePartialConfig(renderingDefaultsConfig, config), videoLinks, stats.group, attrs, options)
    })

    contentWithSvgs = replaceElement("siteswap-group", contentWithSvgs, (_match, p, config, videoLinks, attrs) => {
        stats.group++
        return renderGroup(p, 4, "siteswap-group", mergePartialConfig(renderingDefaultsConfig, config), videoLinks, stats.group, attrs, options)
    })

    contentWithSvgs = replaceElement("video", contentWithSvgs, (_match, p) => {
        if (options.formatVideoLink) {
            return options.formatVideoLink(p)
        }
        return `Video: ${p}`
    })

    return { content: contentWithSvgs, stats }
}

function renderGroup(p: string, nrHands: number, kind: "sync-group" | "siteswap-group", config: Partial<RendererConfig>, videoLinks: string[], index: number, attrs: Record<string, string>, options: RenderSiteswapElementsOptions): string {
    assert(nrHands === 2 || nrHands === 4, "Only 2 or 4 hands supported for group patterns")
    const gp = createGroupPattern(p, nrHands)
    gp.videoLinks = videoLinks

    try {
        const frames = options.mode === "markdown-image" ? parseFramesAttr(attrs["frames"]) : undefined
        if (frames !== undefined) {
            return renderGroupWithFrames(gp, frames, kind, config, index, options)
        }

        const [svg, initData] = renderGroupPattern(gp, config)
        const svgContent = svg.svg()

        if (options.mode === "html" && options.renderGroupInitScript !== false) {
            return svgContent + `\n<script>window.addEventListener("load",function(){initializeFromData(${JSON.stringify(initData)})\n})\n</script>`
        }

        return renderOutput(svgContent, kind, index, options)
    } catch (e) {
        return `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
    }
}

function parseFramesAttr(value: string | undefined): number[] | undefined {
    if (value === undefined) return undefined
    const result: number[] = []
    for (const part of value.split(",")) {
        const trimmed = part.trim()
        if (trimmed === "") continue
        if (trimmed.includes(":")) {
            const pieces = trimmed.split(":").map((s) => s.trim())
            const from = Number.parseFloat(pieces[0])
            const to = Number.parseFloat(pieces[1])
            const step = pieces.length >= 3 && pieces[2] !== "" ? Number.parseFloat(pieces[2]) : 1
            if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(step) || step === 0) continue
            if (step > 0) {
                for (let i = from; i < to; i += step) result.push(i)
            } else {
                for (let i = from; i > to; i += step) result.push(i)
            }
        } else {
            const n = Number.parseFloat(trimmed)
            if (Number.isFinite(n)) result.push(n)
        }
    }
    return result
}

function renderGroupWithFrames(
    gp: ReturnType<typeof createGroupPattern>,
    frames: number[],
    kind: "sync-group" | "siteswap-group",
    config: Partial<RendererConfig>,
    index: number,
    options: RenderSiteswapElementsOptions,
): string {
    if (!options.writeSvgFile) {
        throw new Error("renderSiteswapElements requires writeSvgFile in markdown-image mode")
    }

    const showPattern = config.components === undefined ||
        config.components.some((c) => c === "aidan" || c === "pattern" || c === "default-pattern")

    const lines: string[] = []
    if (showPattern) {
        const limitedConfig: Partial<RendererConfig> = mergePartialConfig({ components: ["default-pattern", "turntable"] }, config)
        limitedConfig.components = limitedConfig.components?.filter((c) => c !== "layout")
        const [svg] = renderGroupPattern(gp, limitedConfig)
        const filename = options.writeSvgFile(svg.svg(), kind, index)
        lines.push(`![tag:patternWithFrames](${filename})`)
    }

    const frameImages = frames.map((time) => {
        const svg = renderAnimationFrameAsSvg(gp, time, mergePartialConfig<AnyRendererConfig>({ showAnimationCounter: true, isAnimationCounterZeroBased: false }, config))
        const filename = options.writeSvgFile!(svg.svg(), "frame", time)
        return `![tag:frame](${filename})`
    })
    lines.push(frameImages.join(" "))

    return lines.join("\n")
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
