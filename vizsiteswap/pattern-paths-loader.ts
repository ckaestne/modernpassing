import { Path, SVG } from "@svgdotjs/svg.js";
import { MovementSegment } from "./pattern-structure.ts";
import { createSVG, scaledown } from "./renderer-svg.ts";
import assert from "node:assert";
import { PatternPath } from "./pattern-paths.ts";

/**
 * loading movement paths from an SVG file
 * 
 * considering all path elements in the SVG file at the root level or in a root-level group
 * 
 * scaled to 0 to 1 based on the largest dimension of the SVG (only considering the starting coordinates
 * of each path, not the size of the actual svg)
 * 
 * @param filename svg file to load
 * @returns 
 */
export function loadPathsFromSvg(filename: string): MovementSegment[] {

    const svgContent = Deno.readTextFileSync(filename);
    const svg = createSVG().svg(svgContent);

    const svgPaths = svg.find('svg > path, svg > g > path')
    let maxX = 0, maxY = 0, minX = Infinity, minY = Infinity
    svgPaths.forEach((path) => {
        const d = path.attr('d').split(/[, ]/)
        if (d[0] === 'M') {
            maxX = Math.max(maxX, parseFloat(d[1]));
            maxY = Math.max(maxY, parseFloat(d[2]));
            minX = Math.min(minX, parseFloat(d[1]));
            minY = Math.min(minY, parseFloat(d[2]));
        }
    });
    const w = Math.max(maxX + Math.max(0,minX), maxY + Math.max(0,minY));


    const scaler = scaledown(w, w);


    const result :MovementSegment[]= []
    svgPaths.forEach((path) => {

        const d = path.attr('d').split(/[, ]/)
        const p = scaler.scalePath(d)

        assert(p[0] === 'M', `path ${path} does not start with M`)
        result.push( {
            fromX: p[1] as number,
            fromY: p[2] as number,
            path: p.slice(3, -2),
            toX: p[p.length - 2] as number,
            toY: p[p.length - 1] as number,
        })
    })
    return result.reverse()

}

export function loadPatternPathsFromSvg(filename: string, startingSegments: number[]): PatternPath {
    const paths = loadPathsFromSvg(filename)
 
    const sequence = paths.map((_, i) => i)

    return {
        initialPositions: startingSegments,
        movementSegments: paths,
        movementSequences: startingSegments.map((s) => sequence.slice(s).concat(sequence.slice(0, s))),
    }
    
}

// console.log(loadPatternPathsFromSvg("../src/shapes/magermix.svg",[0,3,7]))