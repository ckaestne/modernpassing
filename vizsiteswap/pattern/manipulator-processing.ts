import { Beat, CarryAction, InterceptAction, ManipulatorAction, Pattern, Role, SubstitutionAction, Throw, ThrowAction, ThrowType, Time } from "./pattern.ts";
import assert from "node:assert";
import { PatternImpl } from "./pattern-impl.ts";






export function prettyPrintManipulatorActions(pattern: Pattern, mactions: ManipulatorAction[]): string {
    const patternLength = pattern.getLength()
    const roles = Array.from(new Set(mactions.map(t => t.manipulatorRole))).sort()
    let result = ""

    function printMAction(a: ManipulatorAction): string {
        if (a.kind === 'T') return `${a.throwLength}${a.toPasserRole}`
        if (a.kind === 'C') return `C`
        return `${a.kind}${a.fromPasserRole ?? ""}${a.toPasserRole}`
    }

    for (const role of roles) {
        const myThrows = mactions.filter(t => t.manipulatorRole === role).sort((a, b) => a.beat - b.beat)
        result = result + role + ":\t"
        for (let beat = 0; beat < patternLength; beat++) {
            const newRoles = pattern.roles.find(r => r[0] === beat)
            if (beat !== 0 && newRoles) result += '\t'
            const ts = myThrows.filter(t => t.beat === beat)
            result += ts.map(printMAction).join(",")
            result += "\t"
        }
        result += "\n"
    }
    return result
}


export function applyInterceptCarry(pattern: Pattern, intercept: InterceptAction, carry?: CarryAction): Pattern {
    if (carry)
        return applyInterceptCarrys(pattern, [intercept, carry])
    else
        return applyInterceptCarrys(pattern, [intercept])
}


/**
 * This (attempts to) apply all intercept and carry actions of a manipulator. If a manipulator has
 * multiple intercepts, they are applied with the corresponding carry.
 * 
 * The key purpose of this function is to sort through the I and C notation and try to figure out
 * the right pairing of actions. Note that not every intercept needs a carry.
 * This is then translated into an intercept with a carry delay that is applied by @function applyInterceptCarryByDelay
 * where the actual work happens
 * 
 * We are not handling patterns where the manipulator starts with anything than one club, so there
 * will be always at most one carry (no carry if the intercepted throw is a flip or zip or hold(?)).
 * [There could be two carries if the manipulator has 0 clubs in the ground state]
 * 
 * @param pattern 
 * @param actions 
 */
export function applyInterceptCarrys(pattern: Pattern, actions: ManipulatorAction[]): Pattern {
    function getCarryOnBeat(beat: Beat): CarryAction | undefined {
        return actions.find(a => a.kind === 'C' && a.beat === beat) as CarryAction | undefined
    }
    function findCarryDelay(searchDistance: number, delay: number, candidateCarry: Throw | undefined, intercept: InterceptAction): [number | undefined, CarryAction | undefined] {
        if (!candidateCarry || delay > pattern.getLength()) return [undefined, undefined]
        if (searchDistance > pattern.getLength()) throw new Error(`no matching carry found for intercept ${intercept}`)
        const carryAction = getCarryOnBeat(candidateCarry.throwBeat)
        if (carryAction) return [delay, carryAction]
        const nextCandidate = pattern.findThrow(pattern.getThrowCauseBeat(candidateCarry), candidateCarry.toPasserIdx)
        return findCarryDelay(pattern.getThrowCauseTime_(searchDistance, candidateCarry.throwLength), delay + 1, nextCandidate, intercept)
    }


    for (const action of actions) {
        if (action.kind === 'I') {
            const intercept = action




            // find the intercepted throw
            const interceptedThrow = findManipulatedThrow(pattern, intercept)

            const nextCarryableThrow: Throw | undefined = pattern.findThrow(pattern.getThrowCauseBeat(interceptedThrow), interceptedThrow.toPasserIdx)
            const [carryDelay, carryAction] = findCarryDelay(0, 0, nextCarryableThrow, intercept)

            pattern = applyInterceptCarryByDelay(pattern, intercept, carryDelay, carryAction?.toPasserRole)
        }
    }
    return pattern
}

function findManipulatedThrow(pattern: Pattern, action: InterceptAction | SubstitutionAction): Throw {
    let interceptedThrowCandidates = pattern.findThrowsByRole(action.beat, action.fromPasserRole, action.toPasserRole)
    assert(interceptedThrowCandidates.length > 0, `no throw found to intercept on ${action.beat} from ${action.fromPasserRole} to ${action.toPasserRole}`)
    if (interceptedThrowCandidates.length > 1) {
        //ignoring warnings when ambiguous only with flips and zips
        if (interceptedThrowCandidates.filter(t => t.throwLength > pattern.nrHands).length > 1)
            console.warn(`intercept throw ambiguous, found multiple on ${action.beat} from ${action.fromPasserRole} to ${action.toPasserRole}; picking the pass with the highest throw`)
        const highestThrowLength = Math.max(...interceptedThrowCandidates.map(t => t.throwLength))
        interceptedThrowCandidates = interceptedThrowCandidates.filter(t => t.throwLength === highestThrowLength)
    }
    assert(interceptedThrowCandidates.length < 2, `intercept throw ambiguous, found multiple on ${action.beat} from ${action.fromPasserRole} to ${action.toPasserRole}`)
    return interceptedThrowCandidates[0]
}

/**
 * conceptually this should work as follows:
 * 1. At the time that the intercept lands "iTime" (causal time of the intercept throw), the manipulator role is swapped with the manipulated role
 *    The throw originally caused by the intercept at iTime is the only one remaining for the intercepted; the previous manipulator catches the intercept on that beat (usually 0 or zip)
 * 2. At the time the carry is arriving "cTime" (causal time of the carry throw) the switch between manipulator and manipulated is complete
 * 3. Now we need to swap all actions between the manipulator and the manipulated between iTime and cTime (possibly going over the pattern period boundary). 
 *    If cTime is before the end of the pattern, we continue to swap all their actions until the end of the pattern where the real relabeling happens.
 *    [Intuitively, the swapping should happen from the iTime to infinity, however the (adjusted) relabeling at the end of the pattern takes
 *     care of that by looping around. If the cTime has not happened before the end of the pattern, we have adjusted the relabeling too early and
 *     need to continue for a few beats at the beginning of the pattern]
 * 
 * 
 * @param carryDelay the number of throws skipped after the iTime -- typically 0 or 1; this can be unintuitive for throws != 3; delays that are so long that the carry would happen after the next period's intercept lands are rejected
 * @param carryTargetRole the role that the carry is redirected to; not used for any computation since the carry is determined by the intercept + delay; can be optionally provided to check the validity of the notation
 */
export function applyInterceptCarryByDelay(pattern: Pattern, intercept: InterceptAction, carryDelay?: number, carryTargetRole?: Role): Pattern {
    // console.log(`applyInterceptCarryByDelay(I ${intercept.beat} ${intercept.fromPasserRole} ${intercept.toPasserRole} by ${intercept.manipulatorRole} delay ${carryDelay})`)
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(intercept.manipulatorRole))
        pattern = pattern.addRole(intercept.manipulatorRole)
    const patternLength = pattern.getLength()

    // console.log(pattern.prettyPrintThrows())


    // find the intercepted throw
    const interceptedThrow = findManipulatedThrow(pattern, intercept)
    const iBeat = pattern.getThrowCauseBeat(interceptedThrow)

    assert((carryDelay === undefined) === (interceptedThrow.throwLength <= pattern.nrHands), `carryDelay is required if and only if the intercepted throw is not a flip or zip`)


    // note, we are using manipulator and manipulated roles before the rows switch, that is manipulatorRowIdxAfterIBeat is the row of the manipulator before switching, where the manipulated will be after switching)
    const manipulatedRoleOnIBeat = pattern.getRole(iBeat, interceptedThrow.toPasserIdx)

    const manipulatorRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, intercept.manipulatorRole)
    const manipulatedRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, manipulatedRoleOnIBeat)

    // swap labels on the iBeat and relabeling at the end of the pattern
    pattern = pattern.swapRoles(iBeat, manipulatedRoleOnIBeat, intercept.manipulatorRole, false)

    const manipulatorRowIdxAfterWrap = pattern.adjustRowIdxByTime(patternLength, manipulatorRowIdxAfterIBeat)
    const manipulatedRowIdxAfterWrap = pattern.adjustRowIdxByTime(patternLength, manipulatedRowIdxAfterIBeat)

    // console.log(pattern.prettyPrintThrows())

    // let's find the carry and all throws that are skipped in the original pattern if there is a delay
    let carriedThrow: Throw | undefined = undefined
    const skippedThrows: Throw[] = []
    let lastAnalyzedThrow = interceptedThrow
    let cTimeOffset = 0 // offset relative to iBeat
    let carryThrowTime = iBeat
    while (carryDelay !== undefined && carryDelay >= 0) {
        if (carriedThrow)
            skippedThrows.push(carriedThrow)
        // find the throw caused by the intercept (or the previously skipped carry)
        carriedThrow = pattern.findThrow(pattern.getThrowCauseBeat(lastAnalyzedThrow), lastAnalyzedThrow.toPasserIdx)!
        carryThrowTime = iBeat + cTimeOffset
        cTimeOffset = pattern.getThrowCauseTime_(cTimeOffset, carriedThrow.throwLength)
        lastAnalyzedThrow = carriedThrow
        carryDelay--
    }
    const cBeat = carryDelay !== undefined ? (iBeat + cTimeOffset) % patternLength : undefined
    const manipulatedRowIdxAtCarry = pattern.adjustRowIdxByTime(carryThrowTime, manipulatedRowIdxAfterIBeat)

    // the earliest carry can start on the iBeat; the latest must arrive on iBeat + patternLength

    assert(cTimeOffset >= 0, `the carry arrives ${cTimeOffset} beats before the intercept intercept arrives on ${iBeat} -- this is likely incorrect`)
    assert(!carriedThrow || (carryThrowTime >= iBeat), `the carry cannot be started before the intercept arrives ${JSON.stringify(carriedThrow)} -- ${iBeat}`)
    assert(cTimeOffset <= patternLength, `the carry arrives on ${iBeat + cTimeOffset} which is more than one pattern period after the intercept on ${iBeat} -- this is not supported`)


    // console.log(interceptedThrow)
    // console.log(carriedThrow)
    // console.log(skippedThrows)



    const isEarlyIntercept = intercept.modifiers.includes('e') || intercept.modifiers.includes('l')

    for (const t of pattern.throws) {

        // get all passes that arrive to the manipulated passer on or after iTime (includes the carry itself if it does not wrap)
        const needRedirectTarget = t.toPasserIdx === manipulatedRowIdxAfterIBeat && pattern.getThrowCauseBeat(t) >= iBeat
        // also swap for all passes after the period wraps until the carry arrives (includes the carry itself if it wraps)
        const needRedirectTargetWrap = cBeat !== undefined && iBeat + cTimeOffset >= patternLength && t.toPasserIdx === manipulatedRowIdxAfterWrap && pattern.getThrowCauseBeat(t) <= cBeat

        // note: cannot redirect any throws before the iBeat (which could be on beat 0, with it thrown on time -1 or before), but also do not need to
        // get all passes thrown by the manipulated passer on or after iBeat
        let needRedirectSource = t.fromPasserIdx === manipulatedRowIdxAfterIBeat && t.throwBeat > iBeat
        // when we need to wrap around for the carry, also swap all passes thrown before the carry throw beat
        const needRedirectSourceWrap = carriedThrow !== undefined && carryThrowTime >= patternLength && t.fromPasserIdx === manipulatorRowIdxAfterWrap && t.throwBeat <= carriedThrow.throwBeat


        const isInterceptThrow = t === interceptedThrow
        const isCarry = t === carriedThrow
        const isSkippedCarry = skippedThrows.includes(t)

        // for intercept, skipped carries and the actual carry, we redirect only the target, not the source
        if (isSkippedCarry || isCarry) {
            needRedirectSource = false
        }


        let newThrow = t
        if (needRedirectSource || needRedirectTarget || isInterceptThrow || isCarry || isSkippedCarry) {
            pattern = pattern.removeThrow(t)
            const fromPasserIdx = isCarry ? manipulatedRowIdxAtCarry :
                needRedirectSource ? manipulatorRowIdxAfterIBeat :
                    needRedirectSourceWrap ? manipulatedRowIdxAfterWrap : t.fromPasserIdx
            let toPasserIdx = needRedirectTarget ? manipulatorRowIdxAfterIBeat :
                needRedirectTargetWrap ? manipulatorRowIdxAfterWrap : t.toPasserIdx
            let markers = t.markers || []
            if (isInterceptThrow) {
                markers = [...markers, ThrowType.Intercept]
            } else if (isCarry) {
                markers = [...markers, ThrowType.Carry]
            } else if (isSkippedCarry) {
                markers = [...markers, ThrowType.Filled]
            }
            let throwLength = isSkippedCarry ? pattern.nrHands : t.throwLength
            if (isInterceptThrow && isEarlyIntercept) {
                throwLength = pattern.nrHands / 2
                toPasserIdx = pattern.samePasserNBeatsLater(toPasserIdx, pattern.getThrowCauseBeat(t), throwLength - t.throwLength)
            }
            newThrow = {
                ...t,
                fromPasserIdx,
                toPasserIdx: isSkippedCarry ? fromPasserIdx : toPasserIdx,
                throwLength,
                markers,
                // note: isInterceptThrow ? 'I' + intercept.manipulatorRole : isFirstCarryableThrow ? 'C' : t.note,
            }
            pattern = pattern.addThrow(newThrow)
            // skipped carry: we already introduced a 2 at the unchanged source (the new manipulator), now we also introduce
            // a 2 at the target of that skipped throw
            if (isSkippedCarry)
                // if (fromPasserIdx !== toPasserIdx)
                pattern = pattern.addThrow({
                    fromPasserIdx: toPasserIdx,
                    toPasserIdx,
                    fromHand: pattern.getTargetHand(t,0), // where the skipped carry would have landed // TODO: does this need to be adjusted for wraparound?
                    isCrossing: false,
                    throwLength: pattern.nrHands,
                    throwBeat: pattern.getThrowCauseBeat(t),
                    markers: [ThrowType.Filled],
                    note: '2'
                })
            // // intercept: add 0 at target if there is no throw there yet
            // if (isInterceptThrow) {
            //     // const manipulatorThrowOn0Beat = pattern.findThrow(pattern.getThrowCauseBeat(newThrow), newThrow.toPasserIdx)
            //     // if (!manipulatorThrowOn0Beat)
            //     pattern = pattern.addThrow({
            //         fromPasserIdx: newThrow.toPasserIdx,
            //         toPasserIdx: pattern.samePasserNBeatsLater(newThrow.toPasserIdx, pattern.getThrowCauseBeat(newThrow), -pattern.nrHands),
            //         throwBeat: pattern.getThrowCauseBeat(newThrow),
            //         throwLength: 0,
            //         markers: [ThrowType.Filled],
            //         note: '0'
            //     })

            // }
        }
    }




    // console.log(pattern.prettyPrintThrows())

    return pattern
}





export function applySubstitution(pattern: Pattern, substitution: SubstitutionAction): Pattern {
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(substitution.manipulatorRole))
        pattern = pattern.addRole(substitution.manipulatorRole)

    // console.log(pattern.prettyPrintThrows())



    // find the substituted throw
    const substitutedThrow = findManipulatedThrow(pattern, substitution)
    assert(substitutedThrow)

    const isVeryLateSteal = substitution.modifiers.includes('v')

    const pelfLength = isVeryLateSteal ? substitutedThrow.throwLength : pattern.nrHands / 2
    const pelfArrivalBeat = pattern.getThrowCauseBeat_(substitution.beat, pelfLength)
    const manipulatorRowIdxOnPelfArrival = pattern.getRowIdxByRole(pelfArrivalBeat, substitution.manipulatorRole)


    // replace old throw with new substitution throws
    pattern = pattern.removeThrow(substitutedThrow)

    let placementDelay = 0
    if (substitution.modifiers.includes('d')) {
        placementDelay = 1
        const placementDelayModifierIndex = substitution.modifiers.indexOf('d');
        if (placementDelayModifierIndex >= 0 && placementDelayModifierIndex < substitution.modifiers.length - 1) {
            const delayChar = substitution.modifiers[placementDelayModifierIndex + 1];
            if (delayChar >= '0' && delayChar <= '9')
                placementDelay = parseInt(delayChar);
        }
    }

    // adding the throw (pelf) to be stolen
    pattern = pattern.addThrow({
        ...substitutedThrow,
        // toPasserRole: intercept.manipulatorRole,
        toPasserIdx: manipulatorRowIdxOnPelfArrival,
        throwLength: pelfLength,
        markers: [ThrowType.SubstitutionPelf],
        note: 'P' + substitution.toPasserRole + ">" + manipulatorRowIdxOnPelfArrival,
    })


    const handinThrowBeat = (substitutedThrow.throwBeat + placementDelay) % pattern.getLength()
    // the substitution is always thrown by the same physical person as who stole the incoming pass, even if the role has changed,
    // however, the row may have changed if the pattern wraps around
    const manipulatorRowIdxOnHandinThrow = pattern.samePasserNBeatsLater(manipulatorRowIdxOnPelfArrival, pelfArrivalBeat, 0 - pattern.getThrowCauseTime_(0, pelfLength) + placementDelay)

    // putting in another club to replace the stolen one
    pattern = pattern.addThrow({
        ...substitutedThrow,
        fromPasserIdx: manipulatorRowIdxOnHandinThrow,
        throwLength: substitutedThrow.throwLength - placementDelay,
        throwBeat: handinThrowBeat,
        markers: [ThrowType.SubstitutionPlacement],
        note: 'S' + substitution.toPasserRole + ">" + substitutedThrow.toPasserIdx,
    })



    // // add a 0 if the manipulator does not already do anything on the receiving beat
    // const manipulatorThrowOnReceivingBeat = pattern.findThrow(pelfArrivalBeat, manipulatorRowIdxOnPelfArrival)
    // // console.log(manipulatorThrowOnIbeat)
    // if (!manipulatorThrowOnReceivingBeat)
    //     pattern = pattern.addThrow({
    //         fromPasserIdx: manipulatorRowIdxOnPelfArrival,
    //         // fromHand: 1 - substitutedThrow.fromHand, // opposite hand of the substituted throw?
    //         throwBeat: pelfArrivalBeat,
    //         throwLength: 0,
    //         toPasserIdx: pattern.samePasserNBeatsLater(manipulatorRowIdxOnPelfArrival, pelfArrivalBeat, -pattern.nrHands),
    //         // toHand: 1 - substitutedThrow.fromHand,
    //         markers: [ThrowType.Filled],
    //         note: '0'
    //     })

    return pattern
}


export function applyManipulatorThrow(pattern: Pattern, t: ThrowAction): Pattern {
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(t.manipulatorRole))
        pattern = pattern.addRole(t.manipulatorRole)

    // // find the substitued throw
    const toPasserIdx = pattern.getRowIdxByRole(pattern.getThrowCauseBeat_(t.beat, t.throwLength), t.toPasserRole)
    const manipulatorRowIdx = pattern.getRowIdxByRole(t.beat, t.manipulatorRole)

    const existingManipulatorThrow = pattern.findThrow(t.beat, manipulatorRowIdx, undefined)
    if (existingManipulatorThrow && existingManipulatorThrow.throwLength === 0)
        pattern = pattern.removeThrow(existingManipulatorThrow)
    else {
        assert(!existingManipulatorThrow, `existing throw from manipulator on beat ${t.beat} (${JSON.stringify(existingManipulatorThrow)}) where trying to insert new throw ${t.throwLength}${t.toPasserRole}`)
    }

    pattern = pattern.addThrow({
        fromPasserIdx: manipulatorRowIdx,
        toPasserIdx,
        fromHand: t.fromHand,
        isCrossing: t.isCrossing,
        throwBeat: t.beat,
        throwLength: t.throwLength,
        markers: [ThrowType.BaseManipulator],
        note: ''
    })
    return pattern
}


export function applyManipulations(pattern: Pattern, manipulations: ManipulatorAction[]): Pattern {
    assertUniqueIntercepts(manipulations)
    assertUniqueSubstitutions(manipulations)

    // manipulator actions are applied in the following order:
    // 1. intercepts + carry, one manipulator at a time, starting with the earliest intercept
    // 2. substitutions (order should not matter)
    // 3. throws (order should not matter)

    const manipulatorRoles = Array.from(new Set(manipulations.map(m => m.manipulatorRole))).sort()

    for (const mRole of manipulatorRoles)
        if (!pattern.hasRole(mRole))
            pattern = pattern.addRole(mRole)
        else throw new Error(`manipulator role ${mRole} already exists in pattern, cannot add it again`)

    // need to match intercepts and carries where there may be multiple pairs in a row and a row may start with a wraparound carry
    for (const manipulatorRole of manipulatorRoles) {
        const actions = manipulations.filter(m => m.manipulatorRole === manipulatorRole).sort((a, b) => a.beat - b.beat)
        pattern = applyInterceptCarrys(pattern, actions)

        for (const m of actions) {
            if (m.kind === 'S') pattern = applySubstitution(pattern, m)
        }
        for (const m of actions) {
            if (m.kind === 'T') pattern = applyManipulatorThrow(pattern, m)
        }

    }



    // const interceptCarryPairs: [InterceptAction, CarryAction | undefined][] = []
    // // need to match intercepts and carries where there may be multiple pairs in a row and a row may start with a wraparound carry
    // for (const manipulatorRole of manipulatorRoles) {
    //     const actions = manipulations.filter(m => m.manipulatorRole === manipulatorRole && ['I', 'C'].includes(m.kind)).sort((a, b) => a.beat - b.beat)
    //     if (actions.length === 0) continue
    //     if (actions[0].kind === 'C') actions.push(actions.shift()!)
    //     while (actions.length > 0) {
    //         const intercept = actions.shift()!
    //         assert(intercept.kind === 'I', `intercept expected, but found ${intercept.kind} for ${manipulatorRole} at ${intercept.beat}`)
    //         if (actions.length > 0 && actions[0].kind === 'C')
    //             interceptCarryPairs.push([intercept, actions.shift() as CarryAction])
    //         else
    //             interceptCarryPairs.push([intercept, undefined])
    //     }
    // }

    // interceptCarryPairs.sort((a, b) => a[0].beat - b[0].beat)
    // for (const [intercept, carry] of interceptCarryPairs) {
    //     pattern = applyInterceptCarry(pattern, intercept, carry)
    // }

    // for (const m of manipulations) {
    //     if (m.kind === 'S') pattern = applySubstitution(pattern, m)
    // }
    // for (const m of manipulations) {
    //     if (m.kind === 'T') pattern = applyManipulatorThrow(pattern, m)
    // }





    return pattern
}



type Relabeler = (beat: number) => ((role: string) => string)

function assertUniqueIntercepts(mActions: ManipulatorAction[]) {
    const uniqueCheck = new Set<string>();
    for (const m of mActions)
        if (m.kind === 'I') {
            const key = `${m.beat}-${m.fromPasserRole}-${m.toPasserRole}`;
            assert(!uniqueCheck.has(key))
            uniqueCheck.add(key);
        }
}


function assertUniqueSubstitutions(mActions: ManipulatorAction[]) {
    const uniqueCheck = new Set<string>();
    for (const m of mActions)
        if (m.kind === 'S') {
            const key = `${m.beat}-${m.fromPasserRole}-${m.toPasserRole}`;
            assert(!uniqueCheck.has(key))
            uniqueCheck.add(key);
        }
}




export function fillPatternGaps(pattern: Pattern): Pattern {

    const foundThrown: boolean[/*row*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array(pattern.getLength()).fill(false))
    const foundCaught: boolean[/*row*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array(pattern.getLength()).fill(false))

    for (const t of pattern.throws) {
        foundThrown[t.fromPasserIdx][t.throwBeat] = true

        const causeBeat = pattern.getThrowCauseBeat(t)
        foundCaught[t.toPasserIdx][causeBeat] = true
    }

    function onMissingCatch(fn: (rowIdx: number, beat: number) => void, repeat: boolean = false) {
        for (let repeat = 0; repeat < (repeat ? pattern.nrRows : 1); repeat++)
            for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
                for (let beat = 0; beat < pattern.getLength(); beat++)
                    if (!foundCaught[rowIdx][beat])
                        fn(rowIdx, beat)
    }
    function onMissingThrow(fn: (rowIdx: number, beat: number) => void, repeat: boolean = false) {
        for (let repeat = 0; repeat < (repeat ? pattern.nrRows : 1); repeat++)
            for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
                for (let beat = 0; beat < pattern.getLength(); beat++)
                    if (!foundThrown[rowIdx][beat])
                        fn(rowIdx, beat)
    }
    function insertZipToPriorThrow(rowIdx: number, beat: number) {
        const beat1BeatEarlier = (beat - pattern.nrHands/2 + pattern.getLength()) % pattern.getLength()
        const rowIdx1BeatsEarlier = pattern.samePasserNBeatsLater(rowIdx, beat, - pattern.nrHands/2)

        if (foundCaught[rowIdx][beat] &&!foundThrown[rowIdx][beat] && !foundCaught[rowIdx1BeatsEarlier][beat1BeatEarlier] && foundThrown[rowIdx1BeatsEarlier][beat1BeatEarlier]) {
            throw new Error('TODO: hand/crossing')
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
                fromHand: 0, isCrossing: true,
                toPasserIdx: rowIdx1BeatsEarlier,
                throwLength: pattern.nrHands / 2,
                throwBeat: beat,
                markers: [ThrowType.Filled],
                note: '0'
            })
            foundCaught[rowIdx1BeatsEarlier][beat1BeatEarlier] = true
            foundThrown[rowIdx][beat] = true
        }
    }
    function insertCatchWithEmptyHand(rowIdx: number, beat: number) {
        const beat2BeatEarlier = (beat - pattern.nrHands + pattern.getLength()) % pattern.getLength()
        const rowIdx2BeatsEarlier = pattern.samePasserNBeatsLater(rowIdx, beat, - pattern.nrHands)

        if (foundCaught[rowIdx][beat] &&!foundThrown[rowIdx][beat] && !foundCaught[rowIdx2BeatsEarlier][beat2BeatEarlier]) {
            throw new Error('TODO: hand/crossing')
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
                fromHand: 0, isCrossing: true,
                toPasserIdx: rowIdx2BeatsEarlier,
                throwLength: 0,
                throwBeat: beat,
                markers: [ThrowType.Filled],
                note: '0'
            })
            foundCaught[rowIdx2BeatsEarlier][beat2BeatEarlier] = true
            foundThrown[rowIdx][beat] = true
        }
    }
    function insertHoldOnThrowButNoCatch(requireCatch: boolean): (rowIdx: number, beat: number) => void {
        return (rowIdx: number, beat: number) => {
            const beat2BeatLater = (beat + pattern.nrHands) % pattern.getLength()
            const rowIdx2BeatsLater = pattern.samePasserNBeatsLater(rowIdx, beat, pattern.nrHands)

            if (foundThrown[rowIdx][beat] && !foundThrown[rowIdx2BeatsLater][beat2BeatLater] && (!requireCatch || foundCaught[rowIdx2BeatsLater][beat2BeatLater])) {
                throw new Error('TODO: hand/crossing')
                pattern = pattern.addThrow({
                    fromPasserIdx: rowIdx2BeatsLater,
                    fromHand: 0, isCrossing: true,
                    toPasserIdx: rowIdx,
                    throwLength: 0,
                    throwBeat: beat2BeatLater,
                    markers: [ThrowType.Filled],
                    note: '0'
                })
                foundThrown[rowIdx2BeatsLater][beat2BeatLater] = true
                foundCaught[rowIdx][beat] = true
            }
        }
    }
    function insertZipOnThrowButNoCatch(requireCatch: boolean): (rowIdx: number, beat: number) => void {
        return (rowIdx: number, beat: number) => {
        const beat1BeatLater = (beat + pattern.nrHands / 2) % pattern.getLength()
        const rowIdx1BeatsLater = pattern.samePasserNBeatsLater(rowIdx, beat, pattern.nrHands / 2)

        if (foundThrown[rowIdx][beat] && !foundThrown[rowIdx1BeatsLater][beat1BeatLater] && (!requireCatch || foundCaught[rowIdx1BeatsLater][beat1BeatLater])) {
            throw new Error('TODO: hand/crossing')
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx1BeatsLater,
                fromHand: 0, isCrossing: true,
                toPasserIdx: rowIdx,
                throwLength: pattern.nrHands / 2,
                throwBeat: beat1BeatLater,
                markers: [ThrowType.Filled],
                note: 'z'
            })
            foundThrown[rowIdx1BeatsLater][beat1BeatLater] = true
            foundCaught[rowIdx][beat] = true
        }
    }
    }
    function insertFlipWherePossible(rowIdx: number, beat: number) {
        if (!foundThrown[rowIdx][beat]&&!foundCaught[rowIdx][beat]) {
            throw new Error('TODO: hand/crossing')
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
                fromHand: 0, isCrossing: true,
                toPasserIdx: rowIdx,
                throwLength: pattern.nrHands,
                throwBeat: beat,
                markers: [ThrowType.Filled],
                note: 'f'
            })
            foundCaught[rowIdx][beat] = true
            foundThrown[rowIdx][beat] = true
        }
    }

    onMissingThrow(insertZipToPriorThrow, true)
    onMissingThrow(insertCatchWithEmptyHand, true)
    onMissingCatch(insertHoldOnThrowButNoCatch(true), true)
    onMissingCatch(insertZipOnThrowButNoCatch(true), true)
    onMissingCatch(insertFlipWherePossible)
    onMissingCatch(insertHoldOnThrowButNoCatch(false), true)
    onMissingCatch(insertZipOnThrowButNoCatch(false), true)

    // console.log("catches", foundCaught)
    // console.log("throws", foundThrown)

    return pattern
}

