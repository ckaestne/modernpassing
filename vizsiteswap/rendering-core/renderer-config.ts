import { Pattern } from "@modernpassing/pattern"
import assert from "node:assert"

export interface RendererConfig {
    //basic layout
    xDist: number
    xDistMultiplier: number // optional adjustment for xDist for async patterns etc
    yDist: number
    xMargin: number
    yMargin: number
    throwCircleSize: number
    throwCircleColor: string
    throwTextColor: string
    throwTextSize: number

    //length / how many iterations of the pattern to show
    iterations: number

    //starting hands display
    showStartingHands: boolean
    startingHandsOffset: number
    startingHandsTextSize: number

    //annotations
    showLeftRight: boolean
    showStraightCross: boolean
    annotationTextColor: string
    annotationTextSize: number
    //TODO: show annotations above each row, not just above the top and below the bottom row (needed for more than two rows)

    //lines
    showLines: boolean
    lineKind: "causal" | "ladder"
    selectLinesForThrows: undefined | [number, number][] // undefined = show lines for all throws
    lineColor: string
    lineWidth: number
    lineDash: string
    lineBendOrientation: number[] // one orientation for each passer, 0 = straight, -1 = bend top, 1 = bend bottom, can be scaled (e.g. 2=more bend)
    lineBendFactor: number

    //emphasis
    emphasizeThrows: [number, number][] // identified by rowId and beat
    emphasizeCircleColor: string
    emphasizeTextColor: string
    emphasizeLines: [number, number][] // identified by rowId and beat from where the line originates
    emphasizeLineColor: string
    emphasizeLineWith: number
    emphasizeLineDash: string

    //show left and right hand in different rows, mostly for fully sync patterns
    separateleftRightRows: boolean
    yHandDist: number // distance between left and right hand rows (if different from yDist)

    //passer roles
    showPasserRoles: boolean
    showRelabel: boolean
    passerRolesOffset: number
    passerRolesTextSize: number
    roleColors?: string[]
    showRoleColorBackground: boolean // if true, show a background color indicating manipulators and manipulator changes

    //layout and animation options
    components: RenderComponents[]
    layoutSize?: number // undefined/0 picks a default size; any other number is taken as width and height of the layout
    cropLayout: number[] // [top, right, bottom, left] crop margins for the layout (in %)
    turntableTextSize: number
    showManipulatorModifiers: boolean

    gallop: boolean // right hand is 0.1 earlier and left hand 0.1 later
    labelThrows: "siteswap" | "classic" | "simple" | "simpleAllSync" | "none"
    labelPassDestinationRole: boolean // us 3pA instead of 3p to indicate the destination; undefined is the default and means false for 2 passer pattern and true for more passers
}

/**
 * Possible components of a pattern to render:
 * * "pattern": the pattern; for manipulator patterns this is the "local" version with the manipulator applied
 * * "aidan": the Aidan notation for manipulator patterns (only)
 * * "default-pattern": the Aidan notation for manipulator patterns, and the pattern for non-manipulator patterns
 * * "layout": the layout/animation next to the pattern
 * * "video": a tab for the video (if available)
 * * "turntable": the turntable notation below the pattern
 */
export type RenderComponents = "aidan" | "pattern" | "layout" | "video" | "turntable" | "default-pattern"

export const defaultRendererConfig: RendererConfig = {
    xDist: 64,
    xDistMultiplier: 1,
    yDist: 40,
    yHandDist: 34,
    xMargin: 4,
    yMargin: 4,
    throwCircleSize: 40,
    startingHandsOffset: 55,
    iterations: 2,
    showLines: false,
    lineKind: "causal",
    lineBendOrientation: [-1, 1],
    lineBendFactor: 1,
    showLeftRight: true,
    showStraightCross: true,
    showStartingHands: true,
    throwCircleColor: "black",
    throwTextColor: "white",
    throwTextSize: 28,
    lineColor: "gray",
    lineWidth: 1,
    lineDash: "",
    annotationTextColor: "black",
    annotationTextSize: 10,
    startingHandsTextSize: 12,
    emphasizeThrows: [],
    emphasizeCircleColor: "red",
    emphasizeTextColor: "white",
    emphasizeLines: [],
    emphasizeLineColor: "red",
    emphasizeLineWith: 3,
    emphasizeLineDash: "",
    selectLinesForThrows: undefined,
    separateleftRightRows: false,
    showPasserRoles: false,
    showRelabel: true,
    passerRolesOffset: 36,
    passerRolesTextSize: 28,

    components: ["aidan", "pattern", "video", "layout", "turntable"],
    layoutSize: undefined, //default
    cropLayout: [0, 0, 0, 0], 
    roleColors: ["lightblue", "lightgreen", "lightcoral", "lightgoldenrodyellow", "lightpink", "lightcyan", "lightgray", "lightseagreen", "lightsalmon", "lightsteelblue", "lightyellow", "lightblueviolet", "lightcoral"],
    showRoleColorBackground: false,
    turntableTextSize: 16,
    showManipulatorModifiers: true,

    gallop: false,
    labelThrows: "classic",
    labelPassDestinationRole: true,
}

export type FontStyle = {
    size?: number
    color?: string
    weight?: string
    family?: string
}

export type ShapeStyle = {
    fill?: string
    stroke?: string
    strokeWidth?: number
    fillPattern?: string
    innerText?: FontStyle // style for text rendered inside the shape
}

export type LineStyle = {
    color?: string
    width?: number
    dash?: string
}

/** Field-by-field merge of FontStyle layers; later layers override earlier ones. */
export function mergeFontStyle(...layers: (FontStyle | undefined)[]): FontStyle {
    const out: FontStyle = {}
    for (const l of layers) {
        if (!l) continue
        if (l.size !== undefined) out.size = l.size
        if (l.color !== undefined) out.color = l.color
        if (l.weight !== undefined) out.weight = l.weight
        if (l.family !== undefined) out.family = l.family
    }
    return out
}

/** Field-by-field merge of ShapeStyle layers (innerText merged recursively); later layers override earlier ones. */
export function mergeShapeStyle(...layers: (ShapeStyle | undefined)[]): ShapeStyle {
    const out: ShapeStyle = {}
    const innerLayers: (FontStyle | undefined)[] = []
    for (const l of layers) {
        if (!l) continue
        if (l.fill !== undefined) out.fill = l.fill
        if (l.stroke !== undefined) out.stroke = l.stroke
        if (l.strokeWidth !== undefined) out.strokeWidth = l.strokeWidth
        if (l.fillPattern !== undefined) out.fillPattern = l.fillPattern
        innerLayers.push(l.innerText)
    }
    const inner = mergeFontStyle(...innerLayers)
    if (Object.keys(inner).length > 0) out.innerText = inner
    return out
}

/** Field-by-field merge of LineStyle layers; later layers override earlier ones. */
export function mergeLineStyle(...layers: (LineStyle | undefined)[]): LineStyle {
    const out: LineStyle = {}
    for (const l of layers) {
        if (!l) continue
        if (l.color !== undefined) out.color = l.color
        if (l.width !== undefined) out.width = l.width
        if (l.dash !== undefined) out.dash = l.dash
    }
    return out
}

export type RenderLayoutConfig = {
    positionCircle: number
    defaultPasserStyle: ShapeStyle
    roleStyle?: ShapeStyle[] // style for circles representing a role (applied after passerStyle)
    passerStyle?: ShapeStyle[] // style for circles representing a person (applied before roleStyle)
    passStyle: LineStyle // style for lines representing passes
    passLabelStyle: FontStyle // style for pass labels (text next to pass lines)
    walkingArrowStyle: LineStyle // style for lines representing walking
    backgroundLineStyle: LineStyle // fallback style for lines in the background layout
    animateRoleColors: boolean // whether to show colors for passers in the animation corresponding to their role
    //FIX: roleColors has been replaced by roleStyle.fill
    roleColors?: string[] // colors keyed by role index (sourced from RendererConfig when merged)
    showAnimationCounter: boolean
    isAnimationCounterZeroBased: boolean
}
export const defaultRenderLayoutConfig: RenderLayoutConfig = {
    positionCircle: 40,
    defaultPasserStyle: {
        fill: "white",
        stroke: "black",
        strokeWidth: 3,
        innerText: { size: 28, color: "black", weight: "bold" },
    },
    roleStyle: undefined,
    passerStyle: undefined,
    passStyle: { color: "black", width: 1 },
    passLabelStyle: { size: 8, color: "black" },
    walkingArrowStyle: { color: "lightgrey", width: 4 },
    backgroundLineStyle: { color: "black", width: 1 },
    animateRoleColors: false, // this is pretty confusing
    showAnimationCounter: false,
    isAnimationCounterZeroBased: true,
}

export type FrameRenderConfig = {
    showInAirPasses: boolean
    inAirPassStyle: LineStyle // style for passes that are in the air (not on the current beat)
    animationCounterStyle: FontStyle
    frameBorderStyle: LineStyle
    animationCounterBeatsNotTime: boolean
}
export const defaultFrameRenderConfig: FrameRenderConfig = {
    showInAirPasses: true,
    inAirPassStyle: {},
    animationCounterStyle: { size: 24 },
    frameBorderStyle: { width: 3, color: "grey" },
    animationCounterBeatsNotTime: true,
}

/** Union of every renderer config type — operand for the unified merge helpers below.
 * Intersection (not union) so `keyof AnyRendererConfig` enumerates all fields and partial
 * callers can mix fields from any of the three configs in a single object. */
export type AnyRendererConfig = RendererConfig & RenderLayoutConfig & FrameRenderConfig

/**
 * Per-field deep-merger registry. The mapped type forces every entry's value
 * to be a merger whose signature matches the field's type — e.g. assigning
 * `defaultPasserStyle: mergeLineStyle` would be a compile error.
 */
type NestedStyleMergers = {
    [K in keyof AnyRendererConfig]?: (...layers: (AnyRendererConfig[K] | undefined)[]) => AnyRendererConfig[K]
}

const NESTED_STYLE_MERGERS: NestedStyleMergers = {
    defaultPasserStyle: mergeShapeStyle,
    passStyle: mergeLineStyle,
    passLabelStyle: mergeFontStyle,
    walkingArrowStyle: mergeLineStyle,
    backgroundLineStyle: mergeLineStyle,
    inAirPassStyle: mergeLineStyle,
    animationCounterStyle: mergeFontStyle,
    frameBorderStyle: mergeLineStyle,
}

/**
 * Merge one field across all layers using its registered merger.
 * Generic in K so the merger's argument and result types stay linked to the field.
 */
function mergeNestedField<K extends keyof AnyRendererConfig>(
    key: K,
    layers: readonly Partial<AnyRendererConfig>[],
): AnyRendererConfig[K] | undefined {
    const merger = NESTED_STYLE_MERGERS[key]
    if (!merger) return undefined
    const present = layers.map((l) => l[key]).filter((s): s is NonNullable<typeof s> => s !== undefined)
    return present.length > 0 ? merger(...present) : undefined
}

/**
 * Merge two or more partial configs, later layers overriding earlier ones.
 * Known nested style fields (see NESTED_STYLE_MERGERS) are merged field-by-field
 * across all layers; all other fields are shallow-replaced.
 *
 * Generic in T so callers pick the config shape they care about — any one of
 * RendererConfig / RenderLayoutConfig / FrameRenderConfig, an intersection of
 * two, or AnyRendererConfig (all three). Registry entries not present in T are
 * silently skipped at runtime.
 */
export function mergePartialConfig<T extends Partial<AnyRendererConfig>>(...layers: Partial<T>[]): Partial<T> {
    const result: Partial<AnyRendererConfig> = {}
    for (const layer of layers) Object.assign(result, layer)
    for (const key of Object.keys(NESTED_STYLE_MERGERS) as (keyof AnyRendererConfig)[]) {
        const merged = mergeNestedField(key, layers)
        // Dynamic-key dispatch: TS collapses Partial<AnyRendererConfig>[union-of-keys]
        // to `undefined` (the only value safely assignable to *all* fields). The
        // per-field type relationship was already verified inside mergeNestedField,
        // so a single localized cast is sound here.
        if (merged !== undefined) (result as Record<string, unknown>)[key] = merged
    }
    return result as Partial<T>
}

/** Merge a full config base with one or more partial overrides, returning the same config shape. */
export function mergeConfig<T extends Partial<AnyRendererConfig>>(base: T, ...overrides: Partial<T>[]): T {
    return mergePartialConfig<T>(base, ...overrides) as T
}

export function customRendererConfigDefaults(pattern: Pattern): RendererConfig {
    assert(pattern.throws, "Pattern must have throws defined")
    const allSync = pattern.throws.some((value, index, array) => array.findIndex((item) => item.fromOppositeHand !== value.fromOppositeHand && item.fromPasserIdx === value.fromPasserIdx && item.throwBeat === value.throwBeat) >= 0)
    return {
        ...defaultRendererConfig,
        labelThrows: pattern.nrHands === 4 ? "siteswap" : allSync ? "simpleAllSync" : "simple",
        labelPassDestinationRole: pattern.nrRows > 2,
        separateleftRightRows: allSync,
        xDistMultiplier: (allSync || pattern.nrHands === 4 ? .5 : 1),
        showLeftRight: allSync ? false : defaultRendererConfig.showLeftRight,
    }
}
