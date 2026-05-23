/**
 * Named SVG fill patterns referenced by ShapeStyle.fillPattern.
 *
 * To use a pattern, set ShapeStyle.fillPattern to one of FILL_PATTERN_NAMES. The renderer
 * sets fill="url(#<name>)" on the shape; a post-processing step (ensurePatternDefs) walks
 * the produced SVG and injects only the <pattern> definitions that are actually referenced.
 */

export const FILL_PATTERN_NAMES = [
    "stripes",
    "stripes-h",
    "stripes-45",
    "stripes-135",
    "crosshatch",
    "dots",
    "dots-large",
    "grid",
    "checker",
    "zigzag",
] as const

export type FillPatternName = typeof FILL_PATTERN_NAMES[number]

const STRIPE_COLOR = "#bbb"
const STRIPE_WIDTH = 4
const STRIPE_SPACING = 8
const BACKGROUND_COLOR = "white"

function bg(w: number, h: number): string {
    return `<rect x="0" y="0" width="${w}" height="${h}" fill="${BACKGROUND_COLOR}"/>`
}

/**
 * Returns the raw <pattern>...</pattern> SVG fragment for a registered pattern name.
 * Throws if name is not registered.
 */
export function getFillPatternSvg(name: string): string {
    switch (name) {
        case "stripes":
            return stripePattern(name, 0)
        case "stripes-h":
            return stripePattern(name, 90)
        case "stripes-45":
            return stripePattern(name, 45)
        case "stripes-135":
            return stripePattern(name, 135)
        case "crosshatch":
            return crosshatchPattern(name)
        case "dots":
            return dotsPattern(name, 6, 2)
        case "dots-large":
            return dotsPattern(name, 12, 2.5)
        case "grid":
            return gridPattern(name)
        case "checker":
            return checkerPattern(name)
        case "zigzag":
            return zigzagPattern(name)
        default:
            throw new Error(`unknown fill pattern: ${name}`)
    }
}

function stripePattern(id: string, angleDeg: number): string {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${STRIPE_SPACING}" height="${STRIPE_SPACING}" patternTransform="rotate(${angleDeg})">` +
        bg(STRIPE_SPACING, STRIPE_SPACING) +
        `<line x1="0" y1="0" x2="0" y2="${STRIPE_SPACING}" stroke="${STRIPE_COLOR}" stroke-width="${STRIPE_WIDTH}"/>` +
        `</pattern>`
}

function crosshatchPattern(id: string): string {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${STRIPE_SPACING}" height="${STRIPE_SPACING}">` +
        bg(STRIPE_SPACING, STRIPE_SPACING) +
        `<path d="M0,0 L${STRIPE_SPACING},${STRIPE_SPACING} M${STRIPE_SPACING},0 L0,${STRIPE_SPACING}" stroke="${STRIPE_COLOR}" stroke-width="${STRIPE_WIDTH}"/>` +
        `</pattern>`
}

function dotsPattern(id: string, spacing: number, radius: number): string {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${spacing}" height="${spacing}">` +
        bg(spacing, spacing) +
        `<circle cx="${spacing / 2}" cy="${spacing / 2}" r="${radius}" fill="${STRIPE_COLOR}"/>` +
        `</pattern>`
}

function gridPattern(id: string): string {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${STRIPE_SPACING}" height="${STRIPE_SPACING}">` +
        bg(STRIPE_SPACING, STRIPE_SPACING) +
        `<path d="M${STRIPE_SPACING},0 L0,0 L0,${STRIPE_SPACING}" fill="none" stroke="${STRIPE_COLOR}" stroke-width="1"/>` +
        `</pattern>`
}

function checkerPattern(id: string): string {
    const half = STRIPE_SPACING / 2
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${STRIPE_SPACING}" height="${STRIPE_SPACING}">` +
        bg(STRIPE_SPACING, STRIPE_SPACING) +
        `<rect x="0" y="0" width="${half}" height="${half}" fill="${STRIPE_COLOR}"/>` +
        `<rect x="${half}" y="${half}" width="${half}" height="${half}" fill="${STRIPE_COLOR}"/>` +
        `</pattern>`
}

function zigzagPattern(id: string): string {
    const w = STRIPE_SPACING
    const h = STRIPE_SPACING
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">` +
        bg(w, h) +
        `<path d="M0,${h} L${w / 2},0 L${w},${h}" fill="none" stroke="${STRIPE_COLOR}" stroke-width="${STRIPE_WIDTH}"/>` +
        `</pattern>`
}
