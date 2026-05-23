import type { AnimationInitData, AnimationPositionInitData, BackgroundLayout, GroupPattern, TabInitData } from "@modernpassing/layout"
import { type AnimationPlan, createAnimationPlan } from "@modernpassing/layout"
import { Hand, type ManipulatorAction, type Pattern, type Role } from "@modernpassing/pattern"
import { customRendererConfigDefaults, getThrowsFromManipulatorPattern, getThrowsFromPattern, type RenderedThrow, type RendererConfig } from "@modernpassing/rendering-core"
import { scaleup } from "@modernpassing/svg-utils"
import { type Container, type G, type Line, registerWindow, SVG, type Svg, type Text } from "@svgdotjs/svg.js"
import { assert } from "node:console"
import { createSVGWindow } from "svgdom"

export type GroupPatternInitData = {
    animations?: AnimationInitData
    tabs: TabInitData[]
}

export function renderGroupPattern(gp: GroupPattern, config: Partial<RendererConfig>): [Svg, GroupPatternInitData] {
    const changedRenderDefaults: Partial<RendererConfig> = { iterations: 1, showPasserRoles: true }
    const renderConfig: RendererConfig = { ...customRendererConfigDefaults(gp.pattern), ...changedRenderDefaults, ...config }

    // there are three parts that we may render: the pattern, the aidan notation, and the layout
    // not every pattern has aidan notation, and not every group pattern has a layout
    // in addition, the configuration could specify only to render a subset of these
    const size = getRenderPatternSize(gp.pattern, renderConfig)
    const tabTitles: string[] = []
    const tabIds: string[] = []
    for (const component of renderConfig.components) {
        const isManipulatorPattern = gp.aidanNotation !== undefined && gp.aidanNotation[1].length > 0
        if (component === "pattern" || (!isManipulatorPattern && component === "default-pattern")) {
            tabTitles.push("Local")
            tabIds.push("pattern")
        } else if (isManipulatorPattern && (component === "aidan" || component === "default-pattern")) {
            tabTitles.push("Aidan")
            tabIds.push("aidan")
        } else if (component === "video" && gp.videoLinks !== undefined && gp.videoLinks.length > 0) {
            if (gp.videoLinks.length === 1) {
                tabTitles.push("Video")
                tabIds.push("video:" + gp.videoLinks[0])
            } else {
                for (const [i, link] of gp.videoLinks.entries()) {
                    tabTitles.push(`Video ${i + 1}`)
                    tabIds.push(`video:${link}`)
                }
            }
        }
    }

    const withTurntable: boolean = renderConfig.components.includes("turntable") && gp.pattern.mapRows.some((v, i) => v !== i)
    const turntableHeight = withTurntable ? TURNTABLE_HEIGHT : 0
    const tabHeight = tabTitles.length > 1 ? TAB_HEIGHT + TAB_BORDER_WIDTH : 0
    const withLayout: boolean = renderConfig.components.includes("layout") && gp.layout !== undefined
    const onlyLayout = renderConfig.components.length === 1 && renderConfig.components[0] === "layout"
    const layoutSize = withLayout ? renderConfig.layoutSize || size.height : 0

    const layoutGap = 10
    const width = onlyLayout ? layoutSize : size.width + layoutSize + layoutGap
    const height = onlyLayout ? layoutSize : Math.max(size.height + tabHeight + turntableHeight, layoutSize)
    const svg = createSVG(width, height).viewbox(0, 0, width, height).addClass("passingpattern")

    const [panels, tabData] = createTabs(svg, tabTitles)

    for (let i = 0; i < tabIds.length; i++) {
        const panel = panels[i]
        if (tabIds[i] === "pattern") {
            panel.addClass("pattern-canvas")
            const rconfig: RendererConfig = tabIds.includes("aidan") ? { ...renderConfig, showRoleColorBackground: true, showLines: true, lineKind: "causal", lineWidth: 2, ...config } : renderConfig
            renderInternal(panel, gp.pattern, gp.pattern.getInitialRoles(), getThrowsFromPattern(gp.pattern, renderConfig.iterations, renderConfig), getRelabel(gp.pattern), rconfig)
        }
        if (tabIds[i] === "aidan") {
            panel.addClass("aidan-canvas")
            const roles = getInitialAidanRoles(gp.aidanNotation![0], gp.aidanNotation![1])
            renderInternal(panel, gp.pattern, roles, getThrowsFromManipulatorPattern(gp.aidanNotation![0], gp.aidanNotation![1], roles, renderConfig.iterations, renderConfig), getRelabel(gp.aidanNotation![0]), { ...renderConfig, showRoleColorBackground: false, ...config })
        }
        if (tabIds[i].startsWith("video:")) {
            createVideoPanel(tabIds[i].substring(6), panel, size.width, height - tabHeight)
        }
    }

    let animationResult: AnimationInitData | undefined = undefined
    if (withLayout) {
        const layoutCanvas = svg.group().addClass("layout-canvas")
        if (gp.layout!.background) {
            renderBackground(gp.layout!.background, size.height, size.height, layoutCanvas, defaultRenderLayoutConfig)
        }
        const beatIndicator = onlyLayout ? undefined : svg.line(0, 0, 0, size.height + tabHeight).stroke({ color: "lightgrey", width: 4 }).back().hide() // TODO: make this configurable
        const beatXOffsets: number[] = [...Array(gp.pattern.getLength() + 1).keys()].map((i) => getXOffset(size, i))
        const animationPlan = createAnimationPlan(gp.layout!.animation, size.height / defaultRenderLayoutConfig.positionCircle)
        animationResult = renderAnimation(animationPlan, size.height, size.height, layoutCanvas, { ...defaultRenderLayoutConfig, ...renderConfig }, gp.pattern.getLength(), beatIndicator, beatXOffsets, gp.pattern.nrHands / 2)
        if (!onlyLayout) layoutCanvas.transform({ translate: [size.width + layoutGap, tabHeight] })
    }
    if (withTurntable) {
        const turntableCanvas = svg.group().addClass("turntable")
        renderTurntable(turntableCanvas, gp.pattern, renderConfig)
        turntableCanvas.transform({ translate: [0, size.height + tabHeight] })
    }

    return [svg, {
        tabs: tabData,
        animations: animationResult,
    }]
}

function getInitialAidanRoles(p: Pattern, manipulatorActions: ManipulatorAction[]): Role[] {
    // get the initial roles from the pattern, and then apply the manipulator actions to them
    const roles = p.getInitialRoles().slice()
    const manipulatorRoles = [...new Set(manipulatorActions.map((m) => m.manipulatorRole))].sort()
    roles.push(...manipulatorRoles)
    return roles
}

function createVideoPanel(videoLink: string, panel: G, width: number, height: number) {
    // <g id="fig1">
    //     <foreignObject x="0" y="24" width="600" height="376">
    //         <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; background: #fdfdfd; display: flex; align-items: center; justify-content: center;">
    //             <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    //                     frameborder="0" allowfullscreen></iframe>
    //         </div>
    //     </foreignObject>
    // </g>

    panel.addClass("video-canvas")

    // const video = div.element("video").attr({
    //     width: width,
    //     height: height,
    //     controls: "true"
    // });
    // video.element("source").attr({
    //     src: videoLink,
    //     type: "video/mp4"
    // });
    // // video.node.textContent = "Your browser does not support the video tag.";

    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/
    const youtubeMatch = videoLink.match(youtubeRegex)
    if (youtubeMatch && youtubeMatch[1]) {
        // Extract any additional parameters from the original URL
        const urlParams = new URLSearchParams(videoLink.split("?")[1] || "")
        const startTime = urlParams.get("t")

        let embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`
        if (startTime) {
            embedUrl += `?start=${startTime}`
        }

        const fo = panel.element("foreignObject").attr({ x: 0, y: 0, width: width, height: height })
        const div = fo.element("div").attr({
            xmlns: "http://www.w3.org/1999/xhtml",
            style: `width: 100%; height: 100%; background: #fdfdfd; display: flex; align-items: center; justify-content: center;`,
        })

        div.element("iframe").attr({
            width: width,
            height: height,
            src: embedUrl,
            frameborder: "0",
            allowfullscreen: "true",
        })
    } else {
        //  <a href="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" target="_blank">
        //             <text x="300" y="212" text-anchor="middle" dominant-baseline="central" fill="#007acc" text-decoration="underline" cursor="pointer" font-size="14">https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4</text>
        //         </a>
        const a = panel.link(videoLink).target("_blank")
        a.text("").tspan(videoLink).attr({
            x: width / 2,
            y: height / 2,
            "text-anchor": "middle",
            fill: "#007acc",
            "text-decoration": "underline",
            cursor: "pointer",
            "font-size": "14",
        })
    }
}

//TODO: with animations at odd period patterns, L and R annotations should change at runtime
//TODO: compute starting hands for walking patterns

/**
 * Calculate role ranges for background rendering
 * @param p Pattern with roles defined
 * @returns Array of [fromBeat, toBeat, passerIdx, Role] tuples
 */
function calculateRoleRanges(p: Pattern): [number, number, number, string][] {
    const roleRanges: [number, number, number, string][] = []

    for (let beat = 0; beat < p.getLength(); beat++) {
        // Find the active role change for this beat
        const activeRoleChange = p.roles.findLast(([roleBeat]) => roleBeat <= beat)
        if (!activeRoleChange) continue

        const [fromBeat, roles] = activeRoleChange

        // Find the next role change beat
        const nextRoleChange = p.roles.find(([roleBeat]) => roleBeat > beat)
        const toBeat = nextRoleChange ? nextRoleChange[0] : p.getLength()

        // Only add range for the start of each role period
        if (beat === fromBeat) {
            for (let passerIdx = 0; passerIdx < p.nrRows; passerIdx++) {
                roleRanges.push([fromBeat, toBeat, passerIdx, roles[passerIdx]])
            }
        }
    }

    return roleRanges
}

function renderInternal(canvas: G, pattern: Pattern, initialRoles: Role[], renderedThrows: RenderedThrow[], relabel: undefined | (Role | undefined)[], config: RendererConfig): void {
    if (!pattern.isValid()) {
        throw new Error(`Invalid pattern: ${pattern.getValidationError()}\n${pattern.prettyPrintThrows()}`)
    }
    assert(pattern.nrRows === initialRoles.length, `Number of initial roles (${initialRoles.length}) does not match number of rows in pattern (${pattern.nrRows})`)

    const hasAnnotation = config.showStraightCross || config.showLeftRight
    const annotationMargin = hasAnnotation ? config.annotationTextSize : 0

    const maxTime = pattern.getPrefixLength() + pattern.getLength() * config.iterations

    // while (lineBendOrientation.length <= p.nrRows)
    //     lineBendOrientation.push(-1)

    // x offset of any point in the pattern (negative numbers for prefix)
    function xo(time: number): number {
        return getXOffset(size, time)
    }

    // y offset of a throw
    function yo(passerIdx: number, handIdx: 0 | 1 | null): number {
        // TODO: support rendering synchronous throws with both hands
        const r = config.yMargin + (hasAnnotation ? annotationMargin : 0) + config.throwCircleSize / 2 +
            passerIdx * config.yDist +
            (config.separateleftRightRows && handIdx == 1 ? config.yHandDist : 0) + (config.separateleftRightRows ? passerIdx * config.yHandDist : 0)
        if (isNaN(r)) throw new Error(`yo(${passerIdx}, ${handIdx}) is NaN`)
        return r
    }

    const anyRelabel = config.showRelabel && relabel && relabel.some((v) => v !== undefined)
    const size = getRenderPatternSize(pattern, config)

    //debugDrawPatternRenderSize(canvas, size)

    // highlighting of roles in the background (optional)
    if (config.showRoleColorBackground && config.roleColors) {
        const roleRanges = calculateRoleRanges(pattern)
        const relabelingColorX = size.relabelingX + size.relabelingWidth / 4
        const height = config.separateleftRightRows ? config.yDist + config.yHandDist : config.yDist

        // Draw background rectangles for each role range
        for (const [fromBeat, toBeat, passerIdx, role] of roleRanges) {
            const x = fromBeat === 0 ? size.roleLabelX : xo(fromBeat)
            const y = yo(passerIdx, Hand.Right) - config.throwCircleSize / 2
            const toX = toBeat === pattern.getLength() ? relabelingColorX : xo(toBeat)
            const width = toX - x

            // Get color for this role, cycling through available colors
            const roleIndex = pattern.getInitialRoles().indexOf(role)
            const color = config.roleColors![roleIndex % config.roleColors!.length]

            canvas.rect(width, height)
                .move(x, y)
                .fill(color)
                .back() // Send to back so throws appear on top
        }
        // colors for end-of-iteration relabeling
        for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
            const color = config.roleColors![pattern.mapRows[rowIdx]]
            const x = relabelingColorX
            const toX = size.width - config.xMargin
            const y = yo(rowIdx, Hand.Right) - config.throwCircleSize / 2
            const width = toX - x
            canvas.rect(width, height)
                .move(x, y)
                .fill(color)
                .back() // Send to back so throws appear on top
        }
    }

    // function to draw lines for throws, either causal or ladder diagram style
    function throwLine(canvas: G, t: RenderedThrow) {
        //no lines for 0s
        if (t.rethrowTime < 0 || t.toPasserIdx < 0) return

        const startTime = t.throwTime
        const endTime = config.lineKind === "ladder" ? t.rethrowTime : t.causeTime
        const bendAdjustment = config.lineKind === "ladder" ? .6 : 1

        let color = config.lineColor
        let width = config.lineWidth
        let dash = config.lineDash
        // if (startTime < 0 || endTime < 0)
        //     color = earlyCausalLineColor
        // if (startTime > maxTime)
        //     color = extraCausalLineColor
        const isEmphasized = config.emphasizeLines.find((el) => el[0] === t.fromPasserIdx && el[1] === startTime) !== undefined
        if (isEmphasized) {
            color = config.emphasizeLineColor
            width = config.emphasizeLineWith
            dash = config.emphasizeLineDash
        }

        if (yo(t.fromPasserIdx, t.fromHand) !== yo(t.toPasserIdx, t.toHand)) {
            // diagonal lines are straight
            canvas.line(xo(startTime), yo(t.fromPasserIdx, t.fromHand), xo(endTime), yo(t.toPasserIdx, t.toHand))
                .stroke({ color: color, width: width, dasharray: dash })
        } else {
            // self throws are curved
            const dir = config.lineBendOrientation[t.fromPasserIdx] ?? 1
            const xDiff = xo(endTime) - xo(startTime)
            //backward arrows are straight, the rest follows some heuristic
            const bendOffset = xDiff <= 0 ? 0 : config.yDist / 5.5 * xDiff / config.xDist * bendAdjustment

            canvas.path(
                `M ${xo(startTime)} ${yo(t.fromPasserIdx, t.fromHand)} C ${xo(startTime) + bendOffset} ${yo(t.fromPasserIdx, t.fromHand) + dir * bendOffset}, ${xo(endTime) - bendOffset} ${yo(t.toPasserIdx, t.toHand) + dir * bendOffset}, ${xo(endTime)} ${
                    yo(t.toPasserIdx, t.toHand)
                }`,
            )
                .stroke({ color: color, width: width, dasharray: dash }).fill("transparent")
        }
    }

    // lines for throws (either all or just some highlighted), before drawing the throws
    if (config.showLines || config.emphasizeLines.length > 0) {
        for (let idx = 0; idx < renderedThrows.length; idx++) {
            const isEmphasized = config.emphasizeLines.find((el) => el[0] === renderedThrows[idx].fromPasserIdx && el[1] === renderedThrows[idx].throwTime) !== undefined
            const isSelected = !config.selectLinesForThrows || config.selectLinesForThrows.find((el) => el[0] === renderedThrows[idx].fromPasserIdx && el[1] === renderedThrows[idx].throwTime) !== undefined
            if ((config.showLines && isSelected) || isEmphasized) {
                throwLine(canvas, renderedThrows[idx])
            }
        }
    }

    // now the actual throws
    for (let throwIdx = 0; throwIdx < renderedThrows.length; throwIdx++) {
        const t = renderedThrows[throwIdx]
        const isEmphasized: boolean = config.emphasizeThrows.find((et) => et[0] === t.fromPasserIdx && et[1] === t.throwTime) !== undefined
        const circleColor = isEmphasized ? config.emphasizeCircleColor : config.throwCircleColor
        // (t.throwTime >= maxTime ? throwExtraCircleColor : throwCircleColor)
        const circleTextColor = isEmphasized ? config.emphasizeTextColor : config.throwTextColor
        // t.throwTime >= maxTime ? throwExtraTextColor : throwTextColor

        canvas.circle(config.throwCircleSize)
            .center(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand))
            .fill(circleColor)
        canvas.text(renderThrowLabel(t.label, config))
            .amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand))
            .font({ size: config.throwTextSize, "text-anchor": "middle", fill: circleTextColor, "dominant-baseline": "central", "font-weight": "bold" })
        if (config.showManipulatorModifiers && t.modifiers && t.modifiers.length > 0) {
            canvas.text(t.modifiers)
                .amove(xo(t.throwTime) + config.throwCircleSize * .2, yo(t.fromPasserIdx, t.fromHand) - config.throwCircleSize * .3)
                .font({ size: config.throwTextSize * 0.4, "text-anchor": "middle", fill: circleTextColor, "dominant-baseline": "central", weight: "lighter", family: "monospace" })
        }

        if (config.showLeftRight || (config.showStraightCross && t.annotation !== "")) {
            const text = []
            if (config.showLeftRight) {
                text.push(t.fromHand ? "L" : "R")
            }

            if ((config.showStraightCross && t.annotation !== "")) {
                text.push(t.annotation)
            }

            // TODO make this configurable where the labels are printed
            const showAbove = pattern.nrRows === 2 ? t.fromPasserIdx === 0 : t.fromPasserIdx <= 1
            const offset = showAbove ? -config.throwCircleSize / 2 : config.throwCircleSize / 2
            const baseline = showAbove ? "text-after-edge" : "text-before-edge"

            canvas.text("").tspan(text.join(" "))
                .amove(xo(t.throwTime), yo(t.fromPasserIdx, t.fromHand) + offset)
                .addClass("throw-label")
                .font({ size: config.annotationTextSize, "text-anchor": "middle", fill: config.annotationTextColor, "dominant-baseline": baseline })
        }
    }

    // optionally write role labels in the beginning and relabeling labels at the end
    if (config.showPasserRoles) {
        // console.log(p.relabel)
        for (let passerIdx = 0; passerIdx < pattern.nrRows; passerIdx++) {
            canvas.text("").plain(initialRoles[passerIdx] + ":")
                .addClass("passer-roles")
                .font({ size: config.passerRolesTextSize, "text-anchor": "end", fill: config.annotationTextColor, "dominant-baseline": "central" })
                .amove(0, yo(passerIdx, null)).cx(config.xMargin + config.passerRolesOffset / 2)
            if (anyRelabel) {
                const newLabel: Role | undefined = relabel.length > passerIdx ? relabel[passerIdx] : undefined
                if (newLabel) {
                    canvas.text("").plain("→ " + newLabel)
                        .addClass("passer-roles-relabel")
                        .font({ size: config.passerRolesTextSize, "text-anchor": "end", fill: config.annotationTextColor, "dominant-baseline": "central" })
                        .amove(0, yo(passerIdx, null)).cx(size.relabelingX + size.relabelingWidth / 2)
                }
            }
        }
    }

    // and write starting hands (optional)
    if (config.showStartingHands) {
        const hands = pattern.getStartingHands()
        if (!config.separateleftRightRows) {
            for (let passerIdx = 0; passerIdx < pattern.nrRows; passerIdx++) {
                const startingHands = hands[passerIdx]
                canvas.text("").plain(startingHands.join("|"))
                    .amove(config.xMargin + config.startingHandsOffset / 2 + (config.showPasserRoles ? config.passerRolesOffset : 0), yo(passerIdx, null))
                    .addClass("starting-hands")
                    .font({ size: config.startingHandsTextSize, "text-anchor": "middle", fill: config.annotationTextColor, "dominant-baseline": "central" })
            }
        } else {
            for (let passerIdx = 0; passerIdx < pattern.nrRows; passerIdx++) {
                for (const handIdx of [0, 1]) {
                    const startingHand = hands[passerIdx][handIdx]
                    canvas.text("").plain((handIdx === 0 ? "R: " : "L: ") + startingHand)
                        .amove(config.xMargin + config.startingHandsOffset / 2 + (config.showPasserRoles ? config.passerRolesOffset : 0), yo(passerIdx, handIdx as 0 | 1))
                        .addClass("starting-hands")
                        .font({ size: config.startingHandsTextSize, "text-anchor": "middle", fill: config.annotationTextColor, "dominant-baseline": "central" })
                }
            }
        }
    }
}

export function renderPlainPattern(p: Pattern, config?: Partial<RendererConfig>): Svg {
    const renderConfig: RendererConfig = { ...customRendererConfigDefaults(p), ...config }

    const size = getRenderPatternSize(p, renderConfig)
    const svg = createSVG(size.width, size.height).viewbox(0, 0, size.width, size.height).addClass("passingpattern")
    const patternCanvas = svg.group()
    renderInternal(patternCanvas, p, p.getInitialRoles(), getThrowsFromPattern(p, renderConfig.iterations, renderConfig), getRelabel(p), renderConfig)

    return svg
}

export { renderAnimationFrameAsSvg } from "./renderer-svg-frames.ts"

export function createSVG(width?: number, height?: number): Svg {
    const window = createSVGWindow()
    const document = window.document
    registerWindow(window, document)

    const svg = SVG(document.documentElement) as Svg
    if (width && height) {
        svg.size(width, height)
    }
    return svg
}

type RenderLayoutConfig = {
    positionCircle: number
    roleLabelFontSize: number
    roleColors?: string[]
    animateRoleColors: boolean // whether to show colors for passers in the animation corresponding to their role
    showAnimationCounter: boolean
}
export const defaultRenderLayoutConfig: RenderLayoutConfig = {
    positionCircle: 40,
    roleLabelFontSize: 28,
    roleColors: undefined,
    animateRoleColors: false, // this is pretty confusing
    showAnimationCounter: false,
}

// function renderLayout(layout: GroupPatternStaticLayout, width: number, height: number, canvas: G, config: RenderLayoutConfig) {
//     // console.log(layout)
//     const s = Math.min(width, height) - config.positionCircle
//     let left = config.positionCircle / 2
//     let top = config.positionCircle / 2
//     const strokeWidth = 3

//     //shift the layout to the center
//     const topMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
//     const bottomMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
//     top = top + (s - (bottomMost - topMost)) / 2
//     // const leftMost = layout.positions.reduce((acc, pos) => Math.min(acc, pos.x * s), 0)
//     // const rightMost = layout.positions.reduce((acc, pos) => Math.max(acc, pos.x * s), 0)
//     // left = left + (s - (rightMost - leftMost)) / 2
//     function scalep(p: [number, number]): [number, number] {
//         return [Math.round(left + p[0] * s), Math.round(top + p[1] * s)]
//     }

//     canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
//     // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
//     for (let roleIdx = 0; roleIdx < layout.positions.length; roleIdx++) {
//         const pos = layout.positions[roleIdx]
//         const [x, y] = [Math.round(left + pos.x * s), Math.round(top + pos.y * s)]
//         canvas.circle(config.positionCircle - strokeWidth).center(x, y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })
//         canvas.text(pos.role).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
//     }
//     function lookupPosition(role: Role): [number, number] {
//         const r = layout.positions.find(p => p.role === role)!
//         return [r.x, r.y]
//     }
//     for (const pass of layout.passes) {
//         const [fromX, fromY, toX, toY, labelX, labelY] = computePassp(scalep(lookupPosition(pass.fromRole)), pass.fromHand, scalep(lookupPosition(pass.toRole)), pass.toHand)
//         arrow(canvas, fromX, fromY, toX, toY, "black")
//         // canvas.circle(4).center(labelX, labelY).fill("red")
//         canvas.text(pass.label).font({ size: 8 }).cx(labelX).cy(labelY).fill("black")
//     }

//     canvas.rect(width, height).fill('none').stroke("none")
// }
// export function renderLayoutFrames(frames: FrameLayout[], frameWidth: number, frameHeight: number, _config: any = {}): Svg[] {
//     return frames.map((frame) => {
//         const svg = createSVG(frameWidth, frameHeight)
//         renderLayout(frame.static, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
//         svg.rect(20, 20).fill("black").move(0, 0)
//         svg.text(frame.label).font({ size: 16 }).cx(10).cy(10).fill("white")
//         return svg
//     }
//     )
// }

// export function renderStaticLayout(frame: GroupPatternStaticLayout, frameWidth: number, frameHeight: number, _config: any = {}): Svg {
//     const svg = createSVG(frameWidth, frameHeight)
//     renderLayout(frame, frameWidth, frameHeight, svg.group(), defaultRenderLayoutConfig)
//     return svg
// }

let idCounter = 0
function genId(): string {
    return `id${idCounter++}`
}

export function renderBackground(layouts: BackgroundLayout[], width: number, height: number, canvas: Container, config: RenderLayoutConfig) {
    const w = width - config.positionCircle
    const h = height - config.positionCircle
    const left = config.positionCircle / 2
    const top = config.positionCircle / 2
    // console.log(`rendering background ${width} ${height} ${w} ${left} ${top}`)
    const scale = scaleup(left, top, w)

    for (const layout of layouts) {
        if (layout.type === "circle") {
            canvas.ellipse(layout.r * 2 * w, layout.r * 2 * h).center(scale.scalex(layout.x), scale.scaley(layout.y)).fill(layout.fill).stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else if (layout.type === "line") {
            canvas.line(scale.scalex(layout.x1), scale.scaley(layout.y1), scale.scalex(layout.x2), scale.scaley(layout.y2)).stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else if (layout.type === "path") {
            canvas.path(scale.scalePath(layout.segments).join(" ")).fill("none").stroke({ color: layout.stroke, width: layout.strokeWidth })
        } else {
            throw new Error(`unknown background layout type ${layout}`)
        }
    }
}

export function renderAnimation(
    layout: AnimationPlan,
    width: number,
    height: number,
    canvas: Container,
    config: RenderLayoutConfig,
    patternLength: number,
    beatIndicator: Line | undefined = undefined,
    beatXOffsets: number[] | undefined = undefined,
    speed: number = 1,
): AnimationInitData {
    const counter: Text | undefined = config.showAnimationCounter ? canvas.text("_").cx(10).cy(10).fill("black") : undefined

    const roleColors: [Role, string][] = []
    if (config.animateRoleColors && config.roleColors) {
        for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++) {
            if (config.roleColors && config.roleColors[roleIdx]) {
                roleColors.push([layout.initialPositions[roleIdx].initialRole, config.roleColors[roleIdx]])
            }
        }
    }
    const svgCanvasId = `#${canvas.id()}`
    const beatIndicatorId = beatIndicator ? `#${beatIndicator.id()}` : undefined
    const beatLabelId = counter ? `#${counter.id()}` : undefined
    // console.log(layout)
    const s = Math.min(width, height) - config.positionCircle
    const left = config.positionCircle / 2
    const top = config.positionCircle / 2
    const strokeWidth = 3
    const scale = scaleup(left, top, s)
    const positionData: AnimationPositionInitData[] = []

    // //shift the layout to the center
    // const topMost = layout.initialPositions.reduce((acc, pos) => Math.min(acc, pos.y * s), 0)
    // const bottomMost = layout.initialPositions.reduce((acc, pos) => Math.max(acc, pos.y * s), 0)
    // top = top + (s - (bottomMost - topMost)) / 2
    // console.log(`rendering background ${width} ${height} ${s} ${left} ${top}`)

    // canvas.circle(s).center(left + s / 2, top + s / 2).fill("none").stroke("lightgrey")
    // canvas.circle(s+config.positionCircle).fill("none").stroke("lightgrey")
    // const positions: Map<number/*passerIdx*/, [number, number, Element, Text]> = new Map()
    for (let roleIdx = 0; roleIdx < layout.initialPositions.length; roleIdx++) {
        const pos = layout.initialPositions[roleIdx]
        const [x, y] = scale.scale(pos.x, pos.y)
        // const c = canvas.circle(config.positionCircle - strokeWidth).center(x, y).fill("white").stroke({ color: config.colors[roleIdx], width: strokeWidth })
        // const l = canvas.text(pos.label).font({ size: config.roleLabelFontSize }).cx(x).cy(y).fill("black")
        const g = canvas.group()
        const c = canvas.circle(config.positionCircle - strokeWidth).stroke({ color: "black", width: strokeWidth })
        if (config.animateRoleColors && config.roleColors && config.roleColors[roleIdx]) {
            c.fill(config.roleColors[roleIdx])
        } else {
            c.fill("white")
        }
        c.center(x, y)
        const l = canvas.text(pos.initialRole)
            .font({ size: config.roleLabelFontSize, "text-anchor": "middle", fill: "black", "dominant-baseline": "middle", "font-weight": "bold" })
            .center(x, y)
        g.add(c).add(l)
        //no idea why this is needed; it sets x for the tspan attribute (not y) and then doesn't move sideways
        l.children()[0].attr({ x: null })

        // positions.set(pos.passerIdx, [pos.x, pos.y, g, l])

        // addPosition(data: Data, role: Role, x: number, y: number, svgCircleId: string, svgLabelId: string, segmentSequence: number[])
        const svgGroupId = `#${g.id()}`
        const svgLabelId = `#${l.id()}`
        positionData.push({ roleIdx, initialRole: pos.initialRole, x, y, svgGroupId, svgLabelId })
    }

    const scaledPasses = layout.passAnimations.map(scale.scalePass)
    const scaledMovements = layout.movementAnimations.map(scale.scaleDirectMovement)

    canvas.rect(width, height).fill("none").stroke("none")

    return {
        svgCanvasId,
        mod: layout.mod,
        speed,
        roleColors,
        beatIndicatorId,
        beatIndicatorXOffsets: beatXOffsets,
        beatLabelId,
        patternLength,
        positions: positionData,
        passes: scaledPasses,
        directMovements: scaledMovements,
        relabeling: layout.relabeling,
    }
}

function getXOffset(size: PatternRenderSize, time: number): number {
    return size.throwsAreaX + size.throwCircleSize / 2 + time * size.xDist
}

const TAB_WIDTH = 60
const TAB_HEIGHT = 20
const TAB_BORDER_WIDTH = 2
const TURNTABLE_HEIGHT = 24

/**
 * creates a tab for each tabTitle and returns a group element below for each with tab metadata
 * @param svg
 * @param tabTitles
 * @returns
 */
function createTabs(svg: Svg, tabTitles: string[]): [G[], TabInitData[]] {
    if (!tabTitles || tabTitles.length === 0) {
        return [[], []]
    }

    // if there is only one tab, we don't need to create tabs, just a single panel
    if (tabTitles.length === 1) {
        const panel = svg.group()
        return [[panel], []]
    }

    const panels: G[] = []
    const tabs: G[] = []
    const tabData: TabInitData[] = []
    for (let i = 0; i < tabTitles.length; i++) {
        const panel = svg.group()
        const tab = svg.group().addClass("tab")
        if (i === 0) tab.addClass("tab-active")
        else panel.hide()

        tab.rect(TAB_WIDTH, TAB_HEIGHT).move((TAB_WIDTH + TAB_BORDER_WIDTH) * i + TAB_BORDER_WIDTH / 2, TAB_BORDER_WIDTH / 2)
        tab.text(tabTitles[i])
            .amove(TAB_WIDTH / 2 + (TAB_WIDTH + TAB_BORDER_WIDTH) * i + TAB_BORDER_WIDTH / 2, TAB_HEIGHT / 2 + TAB_BORDER_WIDTH)
            .font({ size: 8, "text-anchor": "middle", "dominant-baseline": "central" })
        tab.line((TAB_WIDTH + TAB_BORDER_WIDTH) * i, TAB_HEIGHT + TAB_BORDER_WIDTH, (TAB_WIDTH + TAB_BORDER_WIDTH) * i + TAB_WIDTH + TAB_BORDER_WIDTH, TAB_HEIGHT + TAB_BORDER_WIDTH)

        panel.transform({ translate: [0, TAB_HEIGHT + TAB_BORDER_WIDTH] })

        panels.push(panel)
        tabs.push(tab)
        tabData.push({ tabId: `#${tab.id()}`, panelId: `#${panel.id()}`, active: i === 0 })
    }

    return [panels, tabData]
}

type PatternRenderSize = {
    startingHandsX: number
    startingHandsWidth: number
    roleLabelWidth: number
    roleLabelX: number
    throwsAreaX: number
    throwsAreaWidth: number
    relabelingX: number
    relabelingWidth: number
    width: number
    height: number
    xMargin: number
    xDist: number
    throwCircleSize: number
    throwCircleSeparation: number
}
export function getRenderPatternSize(p: Pattern, config: RendererConfig): PatternRenderSize {
    const xMargin = config.xMargin

    const roleLabelX = xMargin
    const roleLabelWidth = config.showPasserRoles ? config.passerRolesOffset : 0

    const startingHandsX = roleLabelX + roleLabelWidth
    const startingHandsWidth = config.showStartingHands ? config.startingHandsOffset : 0

    const throwCircleSize = config.throwCircleSize
    const throwCircleSeparation = config.xDist - throwCircleSize
    const nrThrows = p.getPrefixLength() + p.getLength() * config.iterations
    const throwsAreaX = startingHandsX + startingHandsWidth
    const throwsAreaWidth = throwCircleSize * nrThrows + throwCircleSeparation * (nrThrows - 1)

    const anyRelabel = config.showRelabel && p.mapRows.some((v, i) => v !== i)
    const relabelingX = throwsAreaX + throwsAreaWidth
    const relabelingWidth = anyRelabel ? config.passerRolesOffset * 2 : 0

    const width = relabelingX + relabelingWidth + xMargin

    const hasAnnotation = config.showStraightCross || config.showLeftRight
    const annotationMargin = hasAnnotation ? config.annotationTextSize : 0

    // const width = config.xMargin * 2 + config.throwCircleSize / 2 +
    //     (config.showStartingHands ? config.startingHandsOffset : 0) + (config.showPasserRoles ? config.passerRolesOffset : 0) +
    //     (p.getPrefixLength() + p.getLength() * config.iterations) * config.xDist +
    //     (anyRelabel && config.showPasserRoles ? relabelWidth : 0)
    const height = config.yMargin * 2 + (hasAnnotation ? annotationMargin : 0) * 2 + config.throwCircleSize + config.yDist * (p.nrRows - 1) +
        (config.separateleftRightRows ? config.yHandDist * 2 : 0)

    return {
        width,
        height,
        xMargin,
        xDist: config.xDist,
        roleLabelWidth,
        roleLabelX,
        startingHandsX,
        startingHandsWidth,
        throwsAreaX,
        throwsAreaWidth,
        relabelingX,
        relabelingWidth,
        throwCircleSize,
        throwCircleSeparation,
    }
}

function _debugDrawPatternRenderSize(canvas: G, size: PatternRenderSize) {
    canvas.rect(size.width, size.height).stroke("black").fill("transparent")
    // margins
    canvas.rect(size.xMargin, size.height).stroke("red").fill("red")
    canvas.rect(size.xMargin, size.height).x(size.width - size.xMargin).stroke("red").fill("red")

    //label box
    canvas.rect(size.roleLabelWidth, size.height).x(size.roleLabelX).stroke("green").fill("transparent")

    //starting hands
    canvas.rect(size.startingHandsWidth, size.height).x(size.startingHandsX).stroke("orange").fill("transparent")

    //throws
    canvas.rect(size.throwsAreaWidth, size.height).x(size.throwsAreaX).stroke("purple").fill("transparent")
    canvas.rect(size.xDist, size.height).x(size.throwsAreaX).stroke("red").fill("transparent")

    // relabeling
    canvas.rect(size.relabelingWidth, size.height).x(size.relabelingX).stroke("green").fill("transparent")
}

function renderTurntable(canvas: G, pattern: Pattern, config: RendererConfig) {
    const roles = pattern.getInitialRoles()
    const todo = pattern.getInitialRoles().slice()
    let turntable = ""
    while (todo.length > 0) {
        let role = todo[0]
        if (turntable.length > 0) {
            turntable += "; "
        }
        turntable += role
        let rowIdx = roles.indexOf(role)
        while (todo.includes(role)) {
            todo.splice(todo.indexOf(role), 1)
            rowIdx = pattern.mapRows[rowIdx]
            role = roles[rowIdx]
            turntable += " → " + role
        }
    }

    canvas.text("").plain(turntable.trim())
        .font({ size: config.turntableTextSize, "dominant-baseline": "central" }).y(config.turntableTextSize / 2)
}

function renderThrowLabel(label: string, config: RendererConfig): (add: Text) => void {
    // add all text using add.plain() -- not as individual characters
    // exception: the single character immediately following _ and ^ which are separately added as add.tspan()
    return (add: Text): void => {
        let i = 0
        while (i < label.length) {
            const char = label[i]
            if ((char === "_" || char === "^") && i + 1 < label.length) {
                // Add the following character as a tspan
                const span = add.tspan(label[i + 1])
                span.dy(char === "_" ? 5 : -8)
                span.font({ size: config.throwTextSize * .6 })
                i += 2
            } else {
                // Find the next special character or end of string
                let j = i
                while (j < label.length && label[j] !== "_" && label[j] !== "^") {
                    j++
                }
                // Add all characters from i to j as plain text
                if (j > i) {
                    add.plain(label.slice(i, j))
                }
                i = j
            }
        }
    }
}

function getRelabel(pattern: Pattern): (string | undefined)[] | undefined {
    const initialRoles = pattern.getInitialRoles()
    return pattern.mapRows.map((r, i) => i !== r ? initialRoles[r] : undefined)
}
