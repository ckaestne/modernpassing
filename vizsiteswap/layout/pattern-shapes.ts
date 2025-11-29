import assert from "node:assert";
import { loadPathsFromSvg } from "./pattern-paths-loader.ts";
import { type PatternPath, PatternPaths } from "./pattern-paths.ts";
import type { Role } from "../pattern/pattern.ts";
import type { MovementSegmentSpec, MovementSequenceSpec, PositionSpec } from "./animation-spec.ts";
import type { BackgroundLayout } from "./layout.ts";




export type TLayout =
    { type: "standard", shape: TShape, roles: Role[], args?: number[] } |
    { type: "free", pos: [Role, number, number][] } |
    { type: "svg", segments: MovementSegmentSpec[], roles: [Role, number][] }
export type TShape = string
//     'Trapezoid' |
//     'V' |
//     'Circle' |
//     'Box' |
//     'Brunos'

export type TMovement = TMovementStep[]
export type TMovementStep = {
    type: TMovementType,
    role: Role,
    when: number,
    duration: number
    extraParam?: number[]
}
export type TMovementType = string; //'Vmove' | 'Bmove' | 'Cmove'

export function defaultLayoutForTwo(roles: Role[]): TLayout {
    assert(roles.length === 2, "default layout for two only works for 2 roles")
    return { type: 'standard', shape: 'Pair', roles }
}


function allMovement(movement: TMovement, type: TMovementType): boolean {
    return movement?.every(m => m.type === type) || false
}


function getCirclePosition(degree: number): [number, number] {
    const x = Math.cos(degree * Math.PI / 180) * 0.5 + 0.5
    const y = Math.sin(degree * Math.PI / 180) * 0.5 + 0.5
    return [x, y]
}


/**
 * abstraction for position shapes (initial positions)
 * and also movement on those positions, but not handling 
 * passes or animations
 */
export type PatternShapeFactory = {
    supportedShapes: TShape[],
    supportedMovement: TMovementType[],
    matches(parsedLayoutInstructions: TLayout, parsedMovementInstructions: TMovement): boolean,
    createLayout(roles: Role[], parsedLayoutInstructions: TLayout, parsedMovementInstructions: TMovement):
        [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]]
}

const factories: PatternShapeFactory[] = []

// add factories here!


// --- free layout, no movement ---
factories.push({
    supportedShapes: ['Free'],
    supportedMovement: [],
    matches: function (parsedLayoutInstructions: TLayout, parsedMovementInstructions: TMovement): boolean {
        return parsedLayoutInstructions.type === 'free' && (parsedMovementInstructions === undefined || parsedMovementInstructions?.length === 0)
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, parsedMovementInstructions: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions = []
        if (layout.type === "free") {
            for (let i = 0; i < layout.pos.length; i += 1) {
                const poss = layout.pos
                const x = poss[i][1]
                const y = poss[i][2]
                assert(!isNaN(x) && x >= 0 && x <= 1, "Invalid x coordinate")
                assert(!isNaN(y) && y >= 0 && y <= 1, "Invalid y coordinate")
                assert(patternRoles.includes(poss[i][0]), `role ${poss[i][0]} not in pattern`)
                positions.push({ passerIdx: patternRoles.indexOf(poss[i][0]), role: poss[i][0], x, y })
            }
        }
        return [positions, [], [], []]
    }
})



// --- circle layout, circle movement ---
factories.push({
    supportedShapes: ['Circle'],
    supportedMovement: ['Cmove'],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Circle' && allMovement(movement, 'Cmove')
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []

        assert(layout.type === 'standard')
        assert(layout.shape === 'Circle')
        const roles = layout.roles
        let angle = -Math.PI / 2
        for (let i = 0; i < roles.length; i++) {
            if (roles[i] !== "_") {
                const x = Math.cos(angle) * 0.5 + 0.5
                const y = Math.sin(angle) * 0.5 + 0.5
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
                positions.push({ role: roles[i], x, y })
            }
            angle += 2 * Math.PI / roles.length
        }
        background.push({ type: "circle", x: 0.5, y: 0.5, r: 0.5, fill: "none", stroke: "lightgrey", strokeWidth: 1 })

        let a_segments: MovementSegmentSpec[] = []
        const sequences: number[][] = []
        if (movement.length === 1 && allMovement(movement, 'Cmove')) {
            const namedRoles = layout.roles.filter(p => /^[A-Z]$/.test(p))
            assert(patternRoles.length === namedRoles.length, "number of passer roles must match layout roles")

            const angleIncrement = 360 / layout.roles.length
            const initialAngles = layout.roles.map((_, i) => i * angleIncrement - 90)
            assert(movement[0].extraParam && movement[0].extraParam.length === 2, "expecting 2 extra parameters for Circle's movement: degree and whether it's a straight walk")
            const movementAngle = movement[0].extraParam![0]
            const isStraightWalk = movement[0].extraParam![1] === 1

            const segments: [number, number][] = [] // fromAngle, toAngle
            for (let roleIdx = 0; roleIdx < patternRoles.length; roleIdx++) {
                const role = patternRoles[roleIdx]
                const circleIdx = layout.roles.indexOf(role)
                const startingAngle = initialAngles[circleIdx]

                const idx = segments.push([startingAngle, (startingAngle + movementAngle) % 360]) - 1
                const sequence = [idx]
                let extraAngle = movementAngle
                while (Math.round(extraAngle % 360) !== 0) {
                    const sidx = segments.push([(startingAngle + extraAngle) % 360, (startingAngle + extraAngle + movementAngle) % 360]) - 1
                    //todo: reuse existing segments
                    sequence.push(sidx)
                    extraAngle += movementAngle
                }
                sequences.push(sequence)
            }


            // get the movement path of each initial position, moving by 90 degree each

            a_segments = segments.map(s => {
                return {
                    fromX: getCirclePosition(s[0])[0],
                    fromY: getCirclePosition(s[0])[1],
                    toX: getCirclePosition(s[1])[0],
                    toY: getCirclePosition(s[1])[1],
                    path: isStraightWalk ? [] : ['A', 0.5, 0.5, 0, 0, 0]
                }
            })

        }
        return [positions, a_segments, sequences, background]
    }
})


const initialV3Positions = [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30]
const initialV4Positions = [/*A*/ 270, /*B*/90 - 45, /*C*/90, /*D*/90 + 45]

// --- V layout, V movement ---
factories.push(createVFactory("V", true))
factories.push(createVFactory("VL", false))

function createVFactory(shapeName: string, moveRight: boolean): PatternShapeFactory {
    return {
        supportedShapes: [shapeName],
        supportedMovement: ['Vmove'],
        matches: function (layout: TLayout, movement: TMovement): boolean {
            return layout.type === 'standard' && layout.shape === shapeName && [3, 4].includes(layout.roles.length) && allMovement(movement, 'Vmove')
        },
        createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
            const positions: PositionSpec[] = []
            const background: BackgroundLayout[] = []

            assert(layout.type === 'standard')
            assert(layout.shape === shapeName)
            const roles = layout.roles

            const angles = roles.length === 3 ? initialV3Positions : initialV4Positions
            for (let i = 0; i < roles.length; i++) {
                const x = Math.cos(angles[i] * Math.PI / 180) * 0.5 + 0.5
                const y = Math.sin(angles[i] * Math.PI / 180) * 0.5 + 0.5
                assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
                positions.push({ role: roles[i], x, y })
            }
            background.push({ type: "circle", x: 0.5, y: 0.5, r: 0.5, fill: "none", stroke: "lightgrey", strokeWidth: 1 })


            //     if (layout.type === 'standard' && layout.shape === 'V' && [3, 4].includes(layout.roles.length) && allMovement('Vmove')) {
            const segments: MovementSegmentSpec[] = []
            const sequences: MovementSequenceSpec[] = []
            if (movement.length > 0) {
                assert(patternRoles.length === layout.roles.length, `number of passer roles must match layout roles ${patternRoles} ${layout.roles}`)
                // get the movement path of each initial position, moving by 90 degree each
                const initialAngles = angles

                let segmentIdx = 0
                for (let passerIdx = 0; passerIdx < patternRoles.length; passerIdx++) {
                    const sequence: MovementSequenceSpec = []
                    const initialAngle = initialAngles[passerIdx]
                    const direction = moveRight ? 1 : -1
                    for (let walkIdx = 0; walkIdx < 4; walkIdx++) {
                        const fromAngle = initialAngle - direction*walkIdx * 90
                        const toAngle = initialAngle - direction*(walkIdx + 1) * 90
                        const [fromX, fromY] = getCirclePosition(fromAngle)
                        const [toX, toY] = getCirclePosition(toAngle)
                        const path = ['A', 0.5, 0.5, 0, 0, moveRight ? 0 : 1]

                        segments.push({
                            fromX,
                            fromY,
                            path,
                            toX,
                            toY
                        })
                        sequence.push(segmentIdx)

                        segmentIdx++
                    }
                    sequences.push(sequence)
                }
            }

            return [positions, segments, sequences, background]
        }
    }
}

// --- trapezoid layout, no movement ---
factories.push({
    supportedShapes: ['Trapezoid'],
    supportedMovement: [],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Trapezoid' && [5].includes(layout.roles.length) && movement.length === 0
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []

        assert(layout.type === 'standard')
        assert(layout.shape === 'Trapezoid')
        const roles = layout.roles
        for (let i = 0; i < 5; i++)
            assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
        positions.push({ role: roles[0], x: 0.25, y: 0 })
        positions.push({ role: roles[1], x: 0.75, y: 0 })
        positions.push({ role: roles[2], x: 0.0, y: 1 })
        positions.push({ role: roles[3], x: 0.5, y: 1 })
        positions.push({ role: roles[4], x: 1, y: 1 })
        background.push({ type: "path", segments: ['M', 0.25, 0, 'L', .75, 0, 'L', 1, 1, 'L', 0, 1, 'L', 0.25, 0], stroke: "lightgrey", strokeWidth: 1 })
        return [positions, [], [], background]
    }
})


// --- box layout, no movement ---
factories.push({
    supportedShapes: ['Box'],
    supportedMovement: [],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Box' && [4].includes(layout.roles.length) && movement.length === 0
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []

        assert(layout.type === 'standard')
        assert(layout.shape === 'Box')
        const roles = layout.roles
        const angles = [-30, 30, 150, 210].map(a => a - 90)
        for (let i = 0; i < roles.length; i++) {
            const x = Math.cos(angles[i] * Math.PI / 180) * 0.5 + 0.5
            const y = Math.sin(angles[i] * Math.PI / 180) * 0.5 + 0.5
            assert(patternRoles.includes(roles[i]), `role ${roles[i]} not in pattern`)
            positions.push({ role: roles[i], x, y })
        }
        return [positions, [], [], background]
    }
})


// -- brunos layout, brunos movement
factories.push({
    supportedShapes: ['Brunos'],
    supportedMovement: ['Bmove'],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Brunos' && [3, 4].includes(layout.roles.length) && allMovement(movement, 'Bmove')
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []

        assert(layout.type === 'standard')
        const roles = layout.roles
        for (let i = 0; i < roles.length; i++) {
            const s = PatternPaths.brunos.movementSegments[PatternPaths.brunos.initialPositions[i]]
            positions.push({ role: roles[i], x: s.fromX, y: s.fromY })
        }


        for (const seg of PatternPaths.brunos.movementSegments) {
            background.push({
                type: "path",
                segments: seg.path,
                stroke: "lightgrey",
                strokeWidth: 1
            })
        }


        assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")

        //         // get the movement path of each initial position, moving by 90 degree each

        const segments: MovementSegmentSpec[] = PatternPaths.brunos.movementSegments.map(s => { return { fromX: s.fromX, fromY: s.fromY, path: s.path.slice(3, 8), toX: s.toX, toY: s.toY } })
        const sequences: MovementSequenceSpec[] = PatternPaths.brunos.movementSequences



        return [positions, segments, sequences, background]
    }
})



// -- brunos layout, brunos movement
factories.push({
    supportedShapes: ['Y'],
    supportedMovement: ['move'],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Y' && [4].includes(layout.roles.length) && allMovement(movement, 'move')
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []

        background.push({ type: 'circle', x: 0.2, y: 0.5, r: 0.2, fill: 'none', stroke: 'lightgrey', strokeWidth: 1 })
        background.push({ type: 'circle', x: 0.8, y: 0.5, r: 0.2, fill: 'none', stroke: 'lightgrey', strokeWidth: 1 })

        assert(layout.type === 'standard')
        const roles = layout.roles
        for (let i = 0; i < roles.length; i++) {
            const s = PatternPaths.y.movementSegments[PatternPaths.y.initialPositions[i]]
            positions.push({ role: roles[i], x: s.fromX, y: s.fromY })
        }




        assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")

        //         // get the movement path of each initial position, moving by 90 degree each

        const segments: MovementSegmentSpec[] = PatternPaths.y.movementSegments.map(s => { return { fromX: s.fromX, fromY: s.fromY, path: s.path.slice(3, 9), toX: s.toX, toY: s.toY } })
        const sequences: MovementSequenceSpec[] = PatternPaths.y.movementSequences



        return [positions, segments, sequences, background]
    }
})



// -- weave layout and movement
factories.push({
    supportedShapes: ['Weave'],
    supportedMovement: ['move'],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Weave' && [4].includes(layout.roles.length) && allMovement(movement, 'move')
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []


        assert(layout.type === 'standard')
        const roles = layout.roles
        for (let i = 0; i < 3; i++) {
            const s = PatternPaths.weave.movementSegments[PatternPaths.weave.initialPositions[i]]
            positions.push({ role: roles[i + 1], x: s.fromX, y: s.fromY })
        }
        positions.push({
            x: .5,
            y: .05,
            role: roles[0]
        })



        for (const seg of PatternPaths.weave.movementSegments) {
            background.push({
                type: "path",
                segments: ['M', seg.fromX, seg.fromY, ...seg.path, seg.toX, seg.toY],
                stroke: "lightgrey",
                strokeWidth: 1
            })
        }




        assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")

        //         // get the movement path of each initial position, moving by 90 degree each

        const segments: MovementSegmentSpec[] = PatternPaths.weave.movementSegments//.map(s => { return { fromX: s.fromX, fromY: s.fromY, path: s.path, toX: s.toX, toY: s.toY } })
        const sequences: MovementSequenceSpec[] = PatternPaths.weave.movementSequences



        return [positions, segments, sequences, background]
    }
})



// -- weave layout and movement
factories.push({
    supportedShapes: ['Svg'],
    supportedMovement: ['move'],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'svg' && allMovement(movement, 'move')
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        const background: BackgroundLayout[] = []


        assert(layout.type === 'svg')
        for (let i = 0; i < layout.roles.length; i++) {
            const initialSegmentIdx = layout.roles[i][1]
            assert(initialSegmentIdx >= 0 && initialSegmentIdx < layout.segments.length, `initial segment index ${initialSegmentIdx} for role ${layout.roles[i][0]} out of bounds for ${layout.segments.length} segments`)
            const s = layout.segments[initialSegmentIdx]
            positions.push({ role: layout.roles[i][0], x: s.fromX, y: s.fromY })
        }

        for (const seg of layout.segments) {
            background.push({
                type: "path",
                segments: ['M', seg.fromX, seg.fromY, ...seg.path, seg.toX, seg.toY],
                stroke: "lightgrey",
                strokeWidth: 1
            })
        }

        assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")

        const segments: MovementSegmentSpec[] = layout.segments

        const sequence = layout.segments.map((_, i) => i)
        const sequences: MovementSequenceSpec[] = layout.roles.map((r) => sequence.slice(r[1]).concat(sequence.slice(0, r[1])))

        return [positions, segments, sequences, background]
    }
})



factories.push(fromPath('Clover', PatternPaths.clover))





// -- brunos layout, brunos movement
factories.push({
    supportedShapes: ['Line'],
    supportedMovement: [],
    matches: function (layout: TLayout, movement: TMovement): boolean {
        return layout.type === 'standard' && layout.shape === 'Line' && [2].includes(layout.roles.length) && movement.length === 0
    },
    createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
        const positions: PositionSpec[] = []
        assert(layout.type === 'standard')

        const margin = layout.args?.[0] || 0
        const roles = layout.roles
        positions.push({ role: roles[0], x: 0+margin, y: .5 })
        positions.push({ role: roles[1], x: 1-margin, y: .5 })

        return [positions, [], [], []]
    }
})






// -- generic layout and movement ("move") on predefined paths in pattern-paths.ts
function fromPath(name: string, path: PatternPath): PatternShapeFactory {
    return {
        supportedShapes: [name],
        supportedMovement: ['move'],
        matches: function (layout: TLayout, movement: TMovement): boolean {
            return layout.type === 'standard' && layout.shape === name && layout.roles.length === path.initialPositions.length && allMovement(movement, 'move')
        },
        createLayout: function (patternRoles: Role[], layout: TLayout, movement: TMovement): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
            const positions: PositionSpec[] = []
            const background: BackgroundLayout[] = []


            assert(layout.type === 'standard')
            const roles = layout.roles
            for (let i = 0; i < roles.length; i++) {
                const s = path.movementSegments[path.initialPositions[i]]
                positions.push({ role: roles[i], x: s.fromX, y: s.fromY })
            }




            for (const seg of path.movementSegments) {
                background.push({
                    type: "path",
                    segments: ['M', seg.fromX, seg.fromY, ...seg.path, seg.toX, seg.toY],
                    stroke: "lightgrey",
                    strokeWidth: 1
                })
            }




            assert(patternRoles.length === layout.roles.length, "number of passer roles must match layout roles")

            return [positions, path.movementSegments, path.movementSequences, background]
        }
    }
}



export const supportedShapes = factories.map(f => f.supportedShapes).flat()
export const supportedMovement = factories.map(f => f.supportedMovement).flat()

export function createShapeLayout(roles: Role[], parsedLayoutInstructions: TLayout, parsedMovementInstructions: TMovement | undefined): [PositionSpec[], MovementSegmentSpec[], MovementSequenceSpec[], BackgroundLayout[]] {
    for (const f of factories)
        if (f.matches(parsedLayoutInstructions, parsedMovementInstructions ? parsedMovementInstructions : []))
            return f.createLayout(roles, parsedLayoutInstructions, parsedMovementInstructions ? parsedMovementInstructions : [])
    throw new Error(`layout/movement combination not supported ${parsedLayoutInstructions.type} ${JSON.stringify(parsedMovementInstructions)}`)
}

// function createLayout(p:PLayout)
