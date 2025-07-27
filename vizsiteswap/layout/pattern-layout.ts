import { type Pattern, type Role } from "@modernpassing/pattern";
import { PassSpec, RelabelSpec } from "./animation-spec.ts";
import type { GroupPatternLayoutSpec } from "./layout.ts";
import { get } from "node:http";




function getRelabelSpec(pattern: Pattern): RelabelSpec[] {
     const layoutRelabel: RelabelSpec[] = []

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
    return layoutRelabel
}



export function setLayoutRelabeling(layout: GroupPatternLayoutSpec, basePattern: Pattern, manipulatorPattern: Pattern): GroupPatternLayoutSpec {
    //TODO extend for manipulator actions
   
    return {
        ...layout,
        animation: {
            ...layout.animation,
            basePatternRelabeling: getRelabelSpec(basePattern),
            relabeling: getRelabelSpec(manipulatorPattern),
        }
    }
}
  
export function addPassAnimations(layout: GroupPatternLayoutSpec, pattern: Pattern): GroupPatternLayoutSpec {
    // console.log(throws)
    const passesToRender: Map<[number/*from*/, number/*fromHand*/, number/*to*/, number/*toHand*/], PassSpec> = new Map()
    const passesPerBeat: Map<number, PassSpec[]> = new Map()
    const passAnimations: PassSpec[] = []
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
                const displayDuration = Math.max(pattern.getThrowCauseLength(t), pattern.nrHands === 4 ? 2 : 1) // for 4 hands, we show the pass for a minimum of two beats, otherwise one
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
                    displayDuration,
                    throwLength: t.throwLength,
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


