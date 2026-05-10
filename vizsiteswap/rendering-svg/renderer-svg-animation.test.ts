// deno-lint-ignore-file no-explicit-any
import fs from "node:fs"
import test from "node:test"
import type { AnimationSpec, MovementSegmentSpec, PassLayoutSpec, PassSpec } from "@modernpassing/layout"
import { createSVG, defaultRenderLayoutConfig, renderAnimation, renderBackground, renderGroupPattern } from "./renderer-svg.ts"
import { createGroupPattern } from "@modernpassing/parsing"
import { Hand } from "../pattern/pattern.ts"
import { createAnimationPlan } from "../layout/create-animation-plan.ts"

// test("render first animation (star with a hole)", async (t) => {

//     const p: [string, number, number][] = [
//         ["A", 0.5, 0],
//         ["B", 0.976, 0.345],
//         ["C", 0.794, 0.905],
//         ["D", 0.206, 0.905],
//         ["E", 0.024, 0.345],
//     ]

//     function rpass(fromRole: string, toRole: string): PassLayoutSpec {
//         return {
//             fromRole,
//             fromHand: Hand.Right,
//             toRole,
//             toHand: Hand.Left,
//             label: ""
//         }
//     }

//     function move(fromPosIdx: number, toPosIdx: number): MovementSegmentSpec {
//         return {
//             fromX: p[fromPosIdx][1],
//             fromY: p[fromPosIdx][2],
//             path: [], // path instructions using C or A for curves and arches in SVG path notation
//             toX: p[toPosIdx][1],
//             toY: p[toPosIdx][2],
//         }
//     }

//     const animation: AnimationSpec = {
//         initialPositions: p.slice(0, 4).map(([role, x, y], idx) => ({ passerIdx: idx, x, y, role })),
//         passAnimations: [
//             {
//                 pass: rpass("A", "D"),
//                 onBeat: 0,
//                 displayDuration: 1,
//                 mod: 4,
//                 throwLength: 3,
//             },
//             {
//                 pass: rpass("C", "A"),
//                 onBeat: 0,
//                 displayDuration: 1,
//                 mod: 4,
//                 throwLength: 3,
//             },
//             {
//                 pass: rpass("D", "B"),
//                 onBeat: 0,
//                 displayDuration: 1,
//                 mod: 4,
//                 throwLength: 3,
//             },
//         ],
//         baseMovementSegments: [move(2, 4), move(0, 2), move(3, 0), move(1, 3), move(4, 1)],
//         baseMovementTriggers: [
//             {
//                 onBeat: 1,
//                 mod: 4,
//                 role: 'C',
//                 duration: 2.9,
//             }
//         ],
//         baseMovementSequences: [[1, 2, 3, 4, 0], [2, 3, 4, 0, 1], [3, 4, 0, 1, 2], [4, 0, 1, 2, 3]],
//         relativeMovements: [],
//         basePatternRelabeling:{
//             initial: ['A', 'B', 'C', 'D'],
//             relabelActions:[{
//                 onBeat: 0,
//                 mod: 4,
//                 changes: [['A', 'C'], ['B', 'D'], ['C', 'B'], ['D', 'A']],
//             },
//         ]},
//         relabeling: {
//             initial: ['A', 'B', 'C', 'D'],
//             relabelActions:[{
//                 onBeat: 0,
//                 mod: 4,
//                 changes: [['A', 'C'], ['B', 'D'], ['C', 'B'], ['D', 'A']],
//             },
//         ]}
//     }

//     const patterns = [animation]

//     let content = "<!DOCTYPE html><html>" +
//         '  <script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js"></script>' +
//         '  <script src="../../dist/animations.js"></script>'

//     for (const p of patterns) {

//         const svg = createSVG(350, 350)
//         svg.id()
//         renderBackground([{
//             type: "circle", r: 0.5, x: 0.5, y: 0.5, fill: 'none',
//             stroke: 'lightgrey', strokeWidth: 1
//         }], 350, 350, svg, defaultRenderLayoutConfig)

//         const js = renderAnimation(createAnimationPlan(p, 350 / defaultRenderLayoutConfig.positionCircle), 350, 350, svg, defaultRenderLayoutConfig, 4)

//         content += `<h2>${p}</h2><p>${svg.svg()}</p>
//         <script>${js}</script>
//         <br/>`
//     }

//     content += "</html>"
//     fs.writeFileSync("test/animation.html", content);

// })

Deno.test("entry point for animations", () => {
    const gp = createGroupPattern(
        `A: 3pB333pC33
B: 3pC333pA33
C: 3pA333pB33
positions: Circle(A,B,C)`,
        2,
    )
    const config = {}
    const [svg, initData] = renderGroupPattern(gp, config)
    // console.log(svg.svg())
    // console.log(initData)
})

Deno.test("animation for 3V", () => {
    const gp = createGroupPattern(
        `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3  -- C
C: 3 3   3pA3  3  3  -- A
M: CBz   SBz   IC.   -- M
N: CCz   SAz   IBe.   -- N
positions: V(A,B,C)
move: Vmove(B,4.9,3)`,
        2,
    )
    const config = {}
    const [svg, initData] = renderGroupPattern(gp, config)
    // console.log(svg.svg())
    // console.log(initData)
})

Deno.test("group pattern data payload", () => {
    const gp = createGroupPattern(
        `A: 3pB33
B: 3pC33
C: 3pA33
positions: Circle(A,B,C)`,
        2,
    )
    const [svg, data] = renderGroupPattern(gp, { components: ["pattern", "layout"] })

    if (!svg.svg().includes("<svg")) throw new Error("Expected SVG output")
    if (!data.animations) throw new Error(`Expected one animation payload, got ${data.animations}`)
    if (data.animations.positions.length === 0) throw new Error("Expected animation position entries")
    if (!data.animations.svgCanvasId.startsWith("#")) throw new Error("Expected svgCanvasId selector")
})
