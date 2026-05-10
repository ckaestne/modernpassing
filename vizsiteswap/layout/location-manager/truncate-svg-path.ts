/**
 * largely AI written code to split svg paths
 */

import assert from "node:assert"
import { svgPathProperties } from "svg-path-properties"

import type { MovementSegmentSpec } from "../animation-spec.ts"

type Point = { x: number; y: number }

const coordinateTolerance = 1e-9
const lengthTolerance = 1e-9

const pointsEqual = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) <= coordinateTolerance && Math.abs(a.y - b.y) <= coordinateTolerance

type LineCommand = {
    kind: "line"
    from: Point
    to: Point
}

type ArcCommand = {
    kind: "arc"
    from: Point
    to: Point
    rx: number
    ry: number
    rotation: number
    largeArcFlag: number
    sweepFlag: number
}

type CubicBezierCommand = {
    kind: "cubic"
    from: Point
    control1: Point
    control2: Point
    to: Point
}

type UnsupportedCommand = {
    kind: "unsupported"
    command: string
}

type PathCommand = LineCommand | ArcCommand | CubicBezierCommand | UnsupportedCommand

type PathPropertiesPart = {
    start: Point
    end: Point
    length: number
    getPointAtLength: (length: number) => Point
}

type PathRepresentation = {
    start: Point
    pathTokens: (string | number)[]
    end: Point
}

const clonePoint = (point: Point): Point => ({ x: point.x, y: point.y })

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
})

const distanceSquared = (a: Point, b: Point): number => {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return dx * dx + dy * dy
}

const cubicPointAt = (command: CubicBezierCommand, t: number): Point => {
    const inv = 1 - t
    const inv2 = inv * inv
    const inv3 = inv2 * inv
    const t2 = t * t
    const t3 = t2 * t

    return {
        x: inv3 * command.from.x +
            3 * inv2 * t * command.control1.x +
            3 * inv * t2 * command.control2.x +
            t3 * command.to.x,
        y: inv3 * command.from.y +
            3 * inv2 * t * command.control1.y +
            3 * inv * t2 * command.control2.y +
            t3 * command.to.y,
    }
}

const splitCubicAtParameter = (command: CubicBezierCommand, t: number): [CubicBezierCommand, CubicBezierCommand] => {
    const p0 = command.from
    const p1 = command.control1
    const p2 = command.control2
    const p3 = command.to

    const q0 = lerpPoint(p0, p1, t)
    const q1 = lerpPoint(p1, p2, t)
    const q2 = lerpPoint(p2, p3, t)
    const r0 = lerpPoint(q0, q1, t)
    const r1 = lerpPoint(q1, q2, t)
    const s = lerpPoint(r0, r1, t)

    return [
        {
            kind: "cubic",
            from: clonePoint(p0),
            control1: q0,
            control2: r0,
            to: s,
        },
        {
            kind: "cubic",
            from: s,
            control1: r1,
            control2: q2,
            to: clonePoint(p3),
        },
    ]
}

const findCubicParameterForPoint = (command: CubicBezierCommand, target: Point): number => {
    const sampleCount = 2048
    let bestT = 0
    let bestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount
        const d = distanceSquared(cubicPointAt(command, t), target)
        if (d < bestDistance) {
            bestDistance = d
            bestT = t
        }
    }

    let left = Math.max(0, bestT - 2 / sampleCount)
    let right = Math.min(1, bestT + 2 / sampleCount)
    for (let i = 0; i < 40; i++) {
        const m1 = left + (right - left) / 3
        const m2 = right - (right - left) / 3
        const d1 = distanceSquared(cubicPointAt(command, m1), target)
        const d2 = distanceSquared(cubicPointAt(command, m2), target)
        if (d1 <= d2) right = m2
        else left = m1
    }

    return (left + right) / 2
}

const normalizeRotation = (rotation: number): number => ((rotation % 360) + 360) % 360

const toRadians = (angle: number): number => angle * (Math.PI / 180)

const angleBetween = (v0: Point, v1: Point): number => {
    const product = v0.x * v1.x + v0.y * v1.y
    const magnitudes = Math.sqrt((v0.x ** 2 + v0.y ** 2) * (v1.x ** 2 + v1.y ** 2))
    const sign = v0.x * v1.y - v0.y * v1.x < 0 ? -1 : 1
    return sign * Math.acos(product / magnitudes)
}

type ArcGeometry = {
    startAngle: number
    sweepAngle: number
    rx: number
    ry: number
    rotation: number
    rotationRad: number
    center: Point
}

const computeArcGeometry = (
    from: Point,
    to: Point,
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArcFlag: number,
    sweepFlag: number,
): ArcGeometry => {
    let rxAbs = Math.abs(rx)
    let ryAbs = Math.abs(ry)
    const rotation = normalizeRotation(xAxisRotation)
    const rotationRad = toRadians(rotation)

    if (pointsEqual(from, to)) {
        return {
            startAngle: 0,
            sweepAngle: 0,
            rx: rxAbs,
            ry: ryAbs,
            rotation,
            rotationRad,
            center: { ...from },
        }
    }

    if (rxAbs === 0 || ryAbs === 0) {
        return {
            startAngle: 0,
            sweepAngle: 0,
            rx: rxAbs,
            ry: ryAbs,
            rotation,
            rotationRad,
            center: { ...from },
        }
    }

    const dx = (from.x - to.x) / 2
    const dy = (from.y - to.y) / 2
    const transformedPoint = {
        x: Math.cos(rotationRad) * dx + Math.sin(rotationRad) * dy,
        y: -Math.sin(rotationRad) * dx + Math.cos(rotationRad) * dy,
    }

    const radiiCheck = transformedPoint.x ** 2 / (rxAbs ** 2) + transformedPoint.y ** 2 / (ryAbs ** 2)
    if (radiiCheck > 1) {
        const scale = Math.sqrt(radiiCheck)
        rxAbs *= scale
        ryAbs *= scale
    }

    const numerator = rxAbs ** 2 * ryAbs ** 2 -
        rxAbs ** 2 * transformedPoint.y ** 2 -
        ryAbs ** 2 * transformedPoint.x ** 2
    const denominator = rxAbs ** 2 * transformedPoint.y ** 2 +
        ryAbs ** 2 * transformedPoint.x ** 2
    let radicand = numerator / denominator
    radicand = radicand < 0 ? 0 : radicand
    const coef = (largeArcFlag !== sweepFlag ? 1 : -1) * Math.sqrt(radicand)
    const transformedCenter = {
        x: (coef * rxAbs * transformedPoint.y) / ryAbs,
        y: (-coef * ryAbs * transformedPoint.x) / rxAbs,
    }

    const center = {
        x: Math.cos(rotationRad) * transformedCenter.x - Math.sin(rotationRad) * transformedCenter.y + (from.x + to.x) / 2,
        y: Math.sin(rotationRad) * transformedCenter.x + Math.cos(rotationRad) * transformedCenter.y + (from.y + to.y) / 2,
    }

    const startVector = {
        x: (transformedPoint.x - transformedCenter.x) / rxAbs,
        y: (transformedPoint.y - transformedCenter.y) / ryAbs,
    }
    const endVector = {
        x: (-transformedPoint.x - transformedCenter.x) / rxAbs,
        y: (-transformedPoint.y - transformedCenter.y) / ryAbs,
    }

    const startAngle = angleBetween({ x: 1, y: 0 }, startVector)
    let sweepAngle = angleBetween(startVector, endVector)
    const sweepFlagBool = sweepFlag === 1
    const largeArcFlagBool = largeArcFlag === 1
    if (!sweepFlagBool && sweepAngle > 0) sweepAngle -= 2 * Math.PI
    else if (sweepFlagBool && sweepAngle < 0) sweepAngle += 2 * Math.PI
    if (largeArcFlagBool && Math.abs(sweepAngle) < Math.PI) {
        sweepAngle += sweepFlagBool ? 2 * Math.PI : -2 * Math.PI
    }
    if (!largeArcFlagBool && Math.abs(sweepAngle) > Math.PI) {
        sweepAngle += sweepFlagBool ? -2 * Math.PI : 2 * Math.PI
    }

    return { startAngle, sweepAngle, rx: rxAbs, ry: ryAbs, rotation, rotationRad, center }
}

const createLineCommand = (from: Point, to: Point): LineCommand => ({
    kind: "line",
    from: clonePoint(from),
    to: clonePoint(to),
})

const segmentToCommands = (segment: MovementSegmentSpec): PathCommand[] => {
    const commands: PathCommand[] = []
    const tokens = segment.path
    let index = 0
    let current: Point = { x: segment.fromX, y: segment.fromY }

    const pushLine = (to: Point) => {
        if (!pointsEqual(current, to)) {
            commands.push(createLineCommand(current, to))
        }
        current = clonePoint(to)
    }

    while (index < tokens.length) {
        const token = tokens[index]
        if (typeof token === "string") {
            switch (token) {
                case "L": {
                    index++
                    while (
                        index + 1 < tokens.length &&
                        typeof tokens[index] === "number" &&
                        typeof tokens[index + 1] === "number"
                    ) {
                        const to: Point = { x: tokens[index] as number, y: tokens[index + 1] as number }
                        pushLine(to)
                        index += 2
                        if (index < tokens.length && typeof tokens[index] === "string") break
                    }
                    break
                }
                case "A": {
                    assert(index + 5 < tokens.length, "arc command requires parameters")
                    const rx = tokens[index + 1] as number
                    const ry = tokens[index + 2] as number
                    const rotation = tokens[index + 3] as number
                    const largeArcFlag = tokens[index + 4] as number
                    const sweepFlag = tokens[index + 5] as number
                    index += 6
                    let to: Point
                    if (
                        index + 1 < tokens.length &&
                        typeof tokens[index] === "number" &&
                        typeof tokens[index + 1] === "number"
                    ) {
                        to = { x: tokens[index] as number, y: tokens[index + 1] as number }
                        index += 2
                    } else {
                        to = { x: segment.toX, y: segment.toY }
                    }
                    if (!pointsEqual(current, to)) {
                        commands.push({
                            kind: "arc",
                            from: clonePoint(current),
                            to: clonePoint(to),
                            rx,
                            ry,
                            rotation,
                            largeArcFlag,
                            sweepFlag,
                        })
                    }
                    current = clonePoint(to)
                    break
                }
                case "C": {
                    index++
                    while (
                        index + 3 < tokens.length &&
                        typeof tokens[index] === "number" &&
                        typeof tokens[index + 1] === "number" &&
                        typeof tokens[index + 2] === "number" &&
                        typeof tokens[index + 3] === "number"
                    ) {
                        const control1: Point = { x: tokens[index] as number, y: tokens[index + 1] as number }
                        const control2: Point = { x: tokens[index + 2] as number, y: tokens[index + 3] as number }
                        index += 4
                        let to: Point
                        if (
                            index + 1 < tokens.length &&
                            typeof tokens[index] === "number" &&
                            typeof tokens[index + 1] === "number"
                        ) {
                            to = { x: tokens[index] as number, y: tokens[index + 1] as number }
                            index += 2
                        } else {
                            to = { x: segment.toX, y: segment.toY }
                        }
                        if (!pointsEqual(current, to)) {
                            commands.push({
                                kind: "cubic",
                                from: clonePoint(current),
                                control1,
                                control2,
                                to,
                            })
                        }
                        current = clonePoint(to)
                        if (index < tokens.length && typeof tokens[index] === "string") break
                    }
                    break
                }
                case "M": {
                    assert(index + 2 < tokens.length, "move command requires coordinates")
                    assert(typeof tokens[index + 1] === "number" && typeof tokens[index + 2] === "number", "move command has invalid coordinates")
                    current = { x: tokens[index + 1] as number, y: tokens[index + 2] as number }
                    index += 3
                    break
                }
                default: {
                    commands.push({ kind: "unsupported", command: token })
                    index++
                    break
                }
            }
        } else {
            assert(
                index + 1 < tokens.length && typeof tokens[index + 1] === "number",
                "unexpected numeric token sequence in path",
            )
            const to: Point = { x: tokens[index] as number, y: tokens[index + 1] as number }
            pushLine(to)
            index += 2
        }
    }

    const finalPoint: Point = { x: segment.toX, y: segment.toY }
    if (!pointsEqual(current, finalPoint)) {
        pushLine(finalPoint)
    }

    return commands
}

const splitCommand = (
    command: PathCommand,
    part: PathPropertiesPart,
    ratio: number,
): [PathCommand | undefined, PathCommand | undefined] => {
    const clampedRatio = Math.min(Math.max(ratio, 0), 1)
    const splitPoint = clonePoint(part.getPointAtLength(part.length * clampedRatio))

    if (command.kind === "line") {
        return [
            createLineCommand(command.from, splitPoint),
            createLineCommand(splitPoint, command.to),
        ]
    }

    if (command.kind === "arc") {
        const geometry = computeArcGeometry(
            command.from,
            command.to,
            command.rx,
            command.ry,
            command.rotation,
            command.largeArcFlag,
            command.sweepFlag,
        )

        const beforeSweep = geometry.sweepAngle * clampedRatio
        const afterSweep = geometry.sweepAngle * (1 - clampedRatio)
        const sweepFlagNormalized = command.sweepFlag ? 1 : 0

        const createArcPortion = (from: Point, to: Point, sweep: number): ArcCommand | undefined => {
            if (Math.abs(sweep) <= lengthTolerance) return undefined
            return {
                kind: "arc",
                from: clonePoint(from),
                to: clonePoint(to),
                rx: geometry.rx,
                ry: geometry.ry,
                rotation: geometry.rotation,
                largeArcFlag: Math.abs(sweep) > Math.PI + lengthTolerance ? 1 : 0,
                sweepFlag: sweepFlagNormalized,
            }
        }

        return [
            createArcPortion(command.from, splitPoint, beforeSweep),
            createArcPortion(splitPoint, command.to, afterSweep),
        ]
    }

    if (command.kind === "cubic") {
        const estimatedT = findCubicParameterForPoint(command, splitPoint)
        const [beforeCurve, afterCurve] = splitCubicAtParameter(command, estimatedT)
        beforeCurve.to = clonePoint(splitPoint)
        afterCurve.from = clonePoint(splitPoint)
        return [beforeCurve, afterCurve]
    }

    throw new Error(`Cannot split unsupported command: ${command.command}`)
}

const commandsToRepresentation = (commands: PathCommand[]): PathRepresentation => {
    assert(commands.length > 0, "cannot build segment from empty path")
    assert(commands[0].kind !== "unsupported", `when truncating svg path: path contains unsupported commands ${JSON.stringify(commands[0])}`)

    const start = clonePoint((commands[0] as LineCommand | ArcCommand | CubicBezierCommand).from)
    const pathTokens: (string | number)[] = []
    let lastPoint = clonePoint(start)

    let linePoints: Point[] = [clonePoint(start)]

    const flushLinePoints = (includeLastPoint: boolean) => {
        if (linePoints.length > 1) {
            const pointsToEmit = includeLastPoint ? linePoints.slice(1) : linePoints.slice(1, -1)
            if (pointsToEmit.length > 0) {
                pathTokens.push("L")
                for (const point of pointsToEmit) {
                    pathTokens.push(point.x, point.y)
                }
            }
            lastPoint = clonePoint(linePoints[linePoints.length - 1])
        }
        linePoints = []
    }

    for (const command of commands) {
        if (command.kind === "unsupported") {
            throw new Error(`Unsupported command encountered: ${command.command}`)
        }

        if (command.kind === "line") {
            if (linePoints.length === 0) {
                linePoints.push(clonePoint(lastPoint))
            }
            linePoints.push(clonePoint(command.to))
            lastPoint = clonePoint(command.to)
            continue
        }

        if (command.kind === "arc") {
            flushLinePoints(true)
            pathTokens.push("A", command.rx, command.ry, command.rotation, command.largeArcFlag, command.sweepFlag)
            lastPoint = clonePoint(command.to)
            linePoints = [clonePoint(lastPoint)]
            continue
        }

        flushLinePoints(true)
        pathTokens.push(
            "C",
            command.control1.x,
            command.control1.y,
            command.control2.x,
            command.control2.y,
        )
        lastPoint = clonePoint(command.to)
        linePoints = [clonePoint(lastPoint)]
    }

    flushLinePoints(false)
    const end = clonePoint(lastPoint)

    return { start, pathTokens, end }
}

const representationToSvgPath = ({ start, pathTokens, end }: PathRepresentation): string => {
    const tokens: (string | number)[] = ["M", start.x, start.y]
    if (pathTokens.length === 0) {
        tokens.push("L", end.x, end.y)
    } else {
        tokens.push(...pathTokens, end.x, end.y)
    }
    return tokens.join(" ")
}

const representationToSegment = ({ start, pathTokens, end }: PathRepresentation): MovementSegmentSpec => ({
    fromX: start.x,
    fromY: start.y,
    path: pathTokens,
    toX: end.x,
    toY: end.y,
})

const commandsToSegment = (commands: PathCommand[]): MovementSegmentSpec => representationToSegment(commandsToRepresentation(commands))

const measureCommands = (commands: PathCommand[]): { parts: PathPropertiesPart[]; totalLength: number } => {
    const representation = commandsToRepresentation(commands)
    const pathStr = representationToSvgPath(representation)
    const properties = new svgPathProperties(pathStr)
    const parts = properties.getParts() as PathPropertiesPart[]
    assert(parts.length === commands.length, "path part lookup mismatch")
    return { parts, totalLength: properties.getTotalLength() }
}

const splitCommands = (
    commands: PathCommand[],
    parts: PathPropertiesPart[],
    totalLength: number,
    splitAtPercentage: number,
): { before: PathCommand[]; after: PathCommand[] } => {
    assert(splitAtPercentage >= 0 && splitAtPercentage <= 1, "splitAtPercentage must be in [0, 1]")
    assert(totalLength > 0, "segment must have positive length")
    assert(parts.length === commands.length, "path part lookup mismatch")

    const splitDistance = totalLength * splitAtPercentage

    const before: PathCommand[] = []
    const after: PathCommand[] = []
    let traversed = 0

    for (let index = 0; index < parts.length; index++) {
        const part = parts[index]
        const command = commands[index]
        if (command.kind === "unsupported") {
            throw new Error(`Unsupported path command encountered: ${command.command}`)
        }

        const start = traversed
        const end = start + part.length
        traversed = end

        if (splitDistance <= start + lengthTolerance) {
            after.push(command)
            continue
        }

        if (splitDistance >= end - lengthTolerance) {
            before.push(command)
            continue
        }

        const beforeLength = splitDistance - start
        const afterLength = end - splitDistance
        if (beforeLength <= lengthTolerance) {
            after.push(command)
            continue
        }
        if (afterLength <= lengthTolerance) {
            before.push(command)
            continue
        }

        const ratio = (splitDistance - start) / part.length
        const [beforeCommand, afterCommand] = splitCommand(command, part, ratio)
        if (beforeCommand) before.push(beforeCommand)
        if (afterCommand) after.push(afterCommand)
    }

    return { before, after }
}

export function truncateAnimation(
    segment: MovementSegmentSpec,
    truncatePercentageBeginning: number,
    truncatePercentageEnd: number = 0,
): MovementSegmentSpec {
    assert(truncatePercentageBeginning >= 0 && truncatePercentageBeginning < 1, "truncatePercentageBeginning must be in [0, 1)")
    assert(truncatePercentageEnd >= 0 && truncatePercentageEnd < 1, "truncatePercentageEnd must be in [0, 1)")
    assert(
        truncatePercentageBeginning + truncatePercentageEnd < 1,
        "sum of truncatePercentageBeginning and truncatePercentageEnd must be < 1",
    )
    const initialCommands = segmentToCommands(segment)
    const { parts: initialParts, totalLength } = measureCommands(initialCommands)
    const { after: afterStart } = splitCommands(initialCommands, initialParts, totalLength, truncatePercentageBeginning)
    assert(afterStart.length > 0, "truncation removed entire segment")
    let workingCommands = afterStart

    if (truncatePercentageEnd > 0) {
        const remainingFraction = 1 - truncatePercentageBeginning
        assert(remainingFraction > 0, "invalid truncation percentages")
        const endTrimRatio = truncatePercentageEnd / remainingFraction
        assert(endTrimRatio < 1, "truncation removed entire segment")
        const keepUntil = 1 - endTrimRatio
        const { parts: remainingParts, totalLength: remainingLength } = measureCommands(workingCommands)
        const { before } = splitCommands(workingCommands, remainingParts, remainingLength, keepUntil)
        assert(before.length > 0, "truncation removed entire segment")
        workingCommands = before
    }

    return commandsToSegment(workingCommands)
}
