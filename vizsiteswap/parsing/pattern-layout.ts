import { createPattern, type GroupPatternLayout, type MovementTrigger, type PassAnimation, type PassLayout, type Pattern, type RelabelAnimation, type Role } from "@modernpassing/pattern";
import { createShapeLayout, parseLayout, type TLayout, type TMovement } from "./pattern-shapes.ts";




/**
 * generates a layout from notation and some information about the passing sequence
 * 
 * as a issue, we need the full passing sequence with both left and right hands, so for
 * odd period patterns, we consider a longer sequence that loops all the way around.
 * hence, we have both the patternLength and the completePatternLength
 * @param layout 
 * @param movement 
 * @param adjustedThrows 
 * @returns 
 */
export function genLayout(layout: TLayout, movement: TMovement | undefined, pattern: Pattern): GroupPatternLayout {

    const [positions, movementSegments, movementSequences, background] = createShapeLayout(pattern.getInitialRoles(), layout, movement)


    // function findPosition(passerIdx: number): PositionLayout {
    //     const p = positions.find(p => p.passerIdx === passerIdx)
    //     if (!p) throw new Error(`position for passer ${passerIdx} not found`)
    //     return p
    // }

    // function pass(t: Throw, iteration: number): PassLayout {
    //     return {
    //         fromRole: findPosition(t.fromPasserIdx).role,
    //         fromHand: pattern.getThrowHand(t, iteration),
    //         toRole: findPosition(pattern.getToPasserIdxAtThrow(t)).role,
    //         toHand: pattern.getTargetHand(t, iteration),
    //         label: (t.throwBeat + 1).toString()
    //     }
    // }




    // const [movementSegments, movementSequences, movementTriggers] = animateMovement(movement, layout, patternRoles, patternLength)
    const movementTriggers: MovementTrigger[] = movement ? movement.map(m => ({
        onBeat: m.when,
        mod: pattern.getLength(),
        role: m.role,
        duration: m.duration
    })) : []


    return {
        // static: { positions: positions, passes: passesToRender.values().toArray() },
        // frames: passesPerBeat.keys().map(k => {
        //     return {
        //         label: (k + 1).toString(),
        //         static: { positions, passes: passesPerBeat.get(k)! }
        //     }
        // }).toArray(),
        animation: {
            initialPositions: positions,
            passAnimations: [],
            movementSegments,
            movementSequences,
            movementTriggers,
            relabeling: [],
            speed: pattern.nrHands === 4 ? 2 : 1
        },
        background
    }
}






export function setLayoutRelabeling(layout: GroupPatternLayout, pattern: Pattern): GroupPatternLayout {
    //TODO extend for manipulator actions
    const layoutRelabel: RelabelAnimation[] = []

    let lastLabels: Role[] = []
    for (const [beat, labels] of pattern.roles) {
        if (beat!==0) {
            const labelChanges: [Role,Role][] = []
            for (let rowIdx = 0; rowIdx < labels.length; rowIdx++) {
                const from = lastLabels[rowIdx]
                const to = labels[rowIdx]
                if (from !== to) 
                    labelChanges.push([from, to])
            }
            if (labelChanges.length > 0) {
                layoutRelabel.push({
                    onBeat: beat,
                    mod: pattern.getLength(),
                    changes: labelChanges,
                })
            }
        }
        lastLabels = labels
    }
    const firstLabels = pattern.getInitialRoles()
    const finalLabelChanges: [Role,Role][] = []
    for (let rowIdx = 0; rowIdx < lastLabels.length; rowIdx++) {
        const from = lastLabels[rowIdx]
        const to = firstLabels[pattern.mapRows[rowIdx]]
        if (from !== to) 
            finalLabelChanges.push([from, to])
    }
    if (finalLabelChanges.length > 0) {
        layoutRelabel.push({
            onBeat: 0,
            mod: pattern.getLength(),
            changes: finalLabelChanges,
        })
    }

    return {
        ...layout,
        animation: {
            ...layout.animation,
            relabeling: layoutRelabel,
        }
    }
}

export function addPassAnimations(layout: GroupPatternLayout, pattern: Pattern): GroupPatternLayout {
    // console.log(throws)
    const passesToRender: Map<[number/*from*/, number/*fromHand*/, number/*to*/, number/*toHand*/], PassLayout> = new Map()
    const passesPerBeat: Map<number, PassLayout[]> = new Map()
    const passAnimations: PassAnimation[] = []
    const nrIterations = pattern.iterationsUntilRepeat()
    const completePatternLength = pattern.getLength() * nrIterations
    // for every iteration of a complete cycle
    for (let iteration = 0; iteration < nrIterations; iteration++)
        //every throw that is a pass
        for (const t of pattern.throws)
            if (t.fromPasserIdx !== pattern.getToPasserIdxAtThrow(t)) {
                const timeOffset = iteration * pattern.getLength()
                // // update passes for overall static layout (no movement, no role adjustments)
                // const p = getOrUpdate4(passesToRender, t.fromPasserIdx, t.fromHand, t.toPasserIdx, t.toHand, () => {
                //     const x = pass(t)
                //     x.label = ""
                //     return x
                // })
                // if (p.label !== "") p.label += ", "
                // p.label += (t.throwTime + 1)

                // // updated passes for individual frames
                // const passesOnBeat = getOrUpdate(passesPerBeat, t.throwTime, () => [])
                // passesOnBeat.push(pass(t))

                // passes for animations
                const fromPasserRole = pattern.getRole(t.throwBeat, t.fromPasserIdx)
                const fromHand = pattern.getThrowHand(t, iteration)
                const toPasserRoleAtThrow = pattern.getToPasserRole(t)
                const toHand = pattern.getTargetHand(t, iteration)
                passAnimations.push({
                    pass: {
                        fromRole: fromPasserRole,
                        fromHand,
                        toRole: toPasserRoleAtThrow,
                        toHand,
                        label: ""
                    },
                    onBeat: timeOffset + t.throwBeat,
                    mod: completePatternLength,
                    duration: pattern.nrHands === 4 ? 2 : 1,
                })
                // console.log(t.throwBeat, fromPasserRole, toPasserRoleAtThrow)
            }

    return {
        ...layout,
        animation: {
            ...layout.animation,
            passAnimations: [...layout.animation.passAnimations, ...passAnimations],
        }
    }
}



export function createLayout(input: string, patternLength: number = 0): GroupPatternLayout {
    return genLayout(parseLayout(input), undefined, createPattern([], 2, [], ['A', 'B', 'C', 'D', 'E']))
}
