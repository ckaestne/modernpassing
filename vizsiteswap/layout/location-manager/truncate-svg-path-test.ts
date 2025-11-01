import { expect } from "jsr:@std/expect";
import assert from "node:assert"
import { createSVG } from "@modernpassing/svg-utils"
import { genPath, helperSvg } from "./helpers.ts"
import { truncateAnimation } from "./truncate-svg-path.ts"
import type { MovementSegmentSpec } from "../animation-spec.ts"

const tolerance = 1e-6

const assertPointsClose = (a: { x: number; y: number }, b: { x: number; y: number }, message?: string) => {
	assert(Math.abs(a.x - b.x) <= tolerance, `${message ?? "point mismatch"} (x)`)
	assert(Math.abs(a.y - b.y) <= tolerance, `${message ?? "point mismatch"} (y)`)
}

const createPath = (segment: MovementSegmentSpec) => genPath(helperSvg, segment)

const assertTrimMatchesOriginal = (original: MovementSegmentSpec, truncated: MovementSegmentSpec, trimStart: number, trimEnd: number) => {
	const originalPath = createPath(original)
	const truncatedPath = createPath(truncated)

	const originalLength = originalPath.length()
	const truncatedLength = truncatedPath.length()

	const pointOnOriginal = (ratio: number) => originalPath.pointAt(originalLength * ratio)
	const pointOnTruncated = (ratio: number) => truncatedPath.pointAt(truncatedLength * ratio)

	assertPointsClose(pointOnOriginal(trimStart), pointOnTruncated(0), "start point mismatch")
	assertPointsClose(pointOnOriginal(1 - trimEnd), pointOnTruncated(1), "end point mismatch")

	const sampleRatio = 0.42
	const expectedOnOriginal = pointOnOriginal(trimStart + (1 - trimStart - trimEnd) * sampleRatio)
	const actualOnTruncated = pointOnTruncated(sampleRatio)
	assertPointsClose(expectedOnOriginal, actualOnTruncated, "sample point mismatch")
}

const createStraightSegment = (): MovementSegmentSpec => ({
	fromX: 0,
	fromY: 0,
	path: [],
	toX: 10,
	toY: 0
})

const expectTrimmedSegment = (segment: MovementSegmentSpec, trimStart: number, trimEnd: number = 0) => {
	const truncated = truncateAnimation(segment, trimStart, trimEnd)
	assertTrimMatchesOriginal(segment, truncated, trimStart, trimEnd)
}

Deno.test("truncateAnimation trims the beginning of a straight segment", () => {
	const segment = createStraightSegment()
	expectTrimmedSegment(segment, 0.25)
})

Deno.test("truncateAnimation trims both ends of a straight segment", () => {
	const segment = createStraightSegment()
	expectTrimmedSegment(segment, 0.1, 0.2)
})

Deno.test("truncate multipart segment of straight lines", () => {
    const segment: MovementSegmentSpec = {
        fromX: 0,
        fromY: 0,
        path: ["L", 5, 0, "L", 10, 5],
        toX: 10,
        toY: 0
    }
    expectTrimmedSegment(segment, 0.1, 0.2)
    expectTrimmedSegment(segment, 0.4)
    expectTrimmedSegment(segment, 0.5)
})

Deno.test("truncateAnimation trims with curved paths not yet supported", () => {
		const segment: MovementSegmentSpec = {
			fromX: 0,
			fromY: 0,
			path: ["C", 0.5, 0, 0.8, 1],
			toX: 1,
			toY: 1
		}
		const startTrim = 0.3
		const endTrim = 0.1
		expect(() => expectTrimmedSegment(segment, startTrim, endTrim)).toThrow()
        
	
})

Deno.test("truncate an arch path", () => {
    // M 145 174 A 150 120 20 0 0 288 314
    const segment: MovementSegmentSpec = {
        fromX: 145,
        fromY: 174,
        path: ["A", 150, 120, 20, 0, 0],
        toX: 288,
        toY: 314
    }
    expectTrimmedSegment(segment, 0.1)
})

Deno.test("truncateAnimation rejects invalid percentages", () => {
	const segment = createStraightSegment()

	assert.throws(() => truncateAnimation(segment, -0.1))
	assert.throws(() => truncateAnimation(segment, 0, -0.1))
	assert.throws(() => truncateAnimation(segment, 0.6, 0.5))
	assert.throws(() => truncateAnimation(segment, 1))
})
