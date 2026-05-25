import { createGroupPattern, createSiteswapPattern, createSyncPattern } from "@modernpassing/parsing"
import { type AnyRendererConfig, mergePartialConfig, renderAnimationFrameAsSvg, renderGroupPattern, RenderLayoutConfig, renderPlainPattern, type FrameRenderConfig } from "@modernpassing/rendering-svg"
import { type RendererConfig } from "@modernpassing/rendering-core"
import { assert } from "node:console"
import { replaceElement } from "../replace-util.ts"
import { GroupPattern } from "@modernpassing/layout"
import { Svg } from "@svgdotjs/svg.js"



type RenderKind = "siteswap" | "sync" | "sync-group" | "siteswap-group" | "frame"

export type RenderStats = {
    siteswap: number
    sync: number
    group: number
}

type RenderMode = "html:inline-svg+js" | "static:svg-file+markdown-image" | "static:inline-svg-for-typst"

function isStaticMode(mode: RenderMode): boolean {
    return mode === "static:svg-file+markdown-image" || mode === "static:inline-svg-for-typst"
}

function escapeForTypstString(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

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
        return renderOutput(svg, "siteswap", stats.siteswap, options, "siteswap")
    })

    contentWithSvgs = replaceElement("sync", contentWithSvgs, (_match, p, config) => {
        stats.sync++
        const pattern = createSyncPattern(p)
        if (!pattern.isValid()) {
            throw new Error(`Invalid sync siteswap: ${p}: \n${pattern.getValidationError()}`)
        }
        const svg = renderPlainPattern(pattern, mergePartialConfig(renderingDefaultsConfig, config))
        return renderOutput(svg, "sync", stats.sync, options, "sync")
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
        const frames = isStaticMode(options.mode) ? (attrs["frames"] ==="auto" || attrs["frames"] === undefined ? getAutoFramesFromPattern(gp) : parseFramesAttr(attrs["frames"])) : undefined
        if (frames !== undefined) {
            return renderGroupWithFrames(gp, frames, kind, config, index, options)
        }

        const [svg, initData] = renderGroupPattern(gp, config)
        const svgContent = svg.svg()

        if (options.mode === "html:inline-svg+js" && options.renderGroupInitScript !== false) {
            return svgContent + `\n<script>window.addEventListener("load",function(){initializeFromData(${JSON.stringify(initData)})\n})\n</script>`
        }

        return renderDynamicOutput(svgContent, kind, index, options)
    } catch (e) {
        return `<pre>ERROR rendering syncgroup:\n${p}: ${e}</pre>`
    }
}

function getAutoFramesFromPattern(gp: GroupPattern): number[] {
    // get every time there is a pass and every time where a movement starts
    const animation = gp.layout?.animation
    if (!animation) return [0]

    const patternLength = gp.pattern.getLength()
    const frames = new Set<number>()
    for (const pass of animation.passAnimations) {
        frames.add(pass.onBeat % patternLength)
    }
    for (const trigger of animation.baseMovementTriggers) {
        frames.add(trigger.onBeat % patternLength)
    }
    for (const movement of animation.relativeMovements) {
        frames.add(movement.onBeat % patternLength)
    }
    const sorted = [...frames].sort((a, b) => a - b)
    if (sorted.length > 0)
        sorted.push(sorted[0] + patternLength) // add one cycle to show the transition back to the initial state    

    return sorted
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
    const showPattern = config.components === undefined ||
        config.components.some((c) => c === "aidan" || c === "pattern" || c === "default-pattern")

    const lines: string[] = []
    if (showPattern) {
        const limitedConfig: Partial<RendererConfig> = mergePartialConfig({ components: ["default-pattern", "turntable"] }, config)
        limitedConfig.components = limitedConfig.components?.filter((c) => c !== "layout" && c!=="video")
        if (limitedConfig.components && limitedConfig.components.includes("pattern") && limitedConfig.components.includes("aidan"))
            limitedConfig.components = limitedConfig.components.filter((c) => c !== "pattern")
        const [svg] = renderGroupPattern(gp, limitedConfig)
        lines.push(renderStaticOutput(svg, kind, index, options, "patternWithFrames"))
    }

    const frameImages = frames.map((time) => {
        const svg = renderAnimationFrameAsSvg(gp, time, mergePartialConfig<AnyRendererConfig>({ showAnimationCounter: true, isAnimationCounterZeroBased: false }, config))
        return renderStaticOutput(svg, "frame", time, options, "frame")
    })
    lines.push(frameImages.join(" "))

    return lines.join("\n")
}

function renderStaticOutput(svg: Svg, kind: RenderKind, index: number, options: RenderSiteswapElementsOptions, tag: string): string {
    if (options.mode === "static:inline-svg-for-typst") {
        svg.addClass(tag)
        return svg.svg()
    }
    if (!options.writeSvgFile) {
        throw new Error("renderSiteswapElements requires writeSvgFile in static:svg-file+markdown-image mode")
    }
    const filename = options.writeSvgFile(svg.svg(), kind, index)
    return tag ? `![tag:${tag}](${filename})` : `![](${filename})`
}

function renderOutput(svg: Svg, kind: RenderKind, index: number, options: RenderSiteswapElementsOptions, tag: string): string {
    if (options.mode === "html:inline-svg+js") {
        return svg.svg()
    }
    return renderStaticOutput(svg, kind, index, options, tag)
}

function renderDynamicOutput(svg: string, kind: RenderKind, index: number, options: RenderSiteswapElementsOptions): string {
    if (options.mode === "html:inline-svg+js") {
        return svg
    }
    throw new Error("Dynamic output is not supported in static mode")
}
