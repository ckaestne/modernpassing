import { baseManipulatorMarker, type Beat, type CarryAction, CarryMarker, createPattern, filledMarker, Hand, type InterceptAction, InterceptMarker, type ManipulatorAction, type Pattern, type Role, type SubstitutionAction, SubstitutionMarker, type Throw, type ThrowAction, type ThrowMarker } from "@modernpassing/pattern";
import assert from "node:assert";
import { PatternImpl } from "../pattern/pattern-impl.ts";






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
        const nextCandidate = pattern.findThrow(pattern.getThrowCauseBeat(candidateCarry), candidateCarry.toPasserIdxAtCausal)
        return findCarryDelay(pattern.getThrowCauseTime_(searchDistance, candidateCarry.throwLength), delay + 1, nextCandidate, intercept)
    }


    for (const action of actions) {
        if (action.kind === 'I') {
            const intercept = action




            // find the intercepted throw
            const interceptedThrow = findManipulatedThrow(pattern, intercept)

            const nextCarryableThrow: Throw | undefined = pattern.findThrow(pattern.getThrowCauseBeat(interceptedThrow), interceptedThrow.toPasserIdxAtCausal)
            const [carryDelay, carryAction] = findCarryDelay(0, 0, nextCarryableThrow, intercept)

            pattern = applyInterceptCarryByDelay(pattern, intercept, carryDelay, carryAction)
        }
    }
    return pattern
}

function findManipulatedThrow(pattern: Pattern, action: InterceptAction | SubstitutionAction): Throw {
    let interceptedThrowCandidates = pattern.findThrowsByRoleAtThrow(action.beat, action.fromPasserRole, action.toPasserRole)
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
export function applyInterceptCarryByDelay(pattern: Pattern, intercept: InterceptAction, carryDelay?: number, carryAction?: CarryAction): Pattern {
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
    const manipulatedRoleOnIBeat = pattern.getRole(iBeat, interceptedThrow.toPasserIdxAtCausal)

    const manipulatorRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, intercept.manipulatorRole)
    const manipulatedRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, manipulatedRoleOnIBeat)

    const initialPattern = pattern

    // swap labels on the iBeat and relabeling at the end of the pattern
    pattern = pattern.swapRoles(iBeat, manipulatedRoleOnIBeat, intercept.manipulatorRole, false)

    // for hands and crossing also the two roles swap, that is the *role* in a different row continues with
    // the same hand sequences 
    // pattern = swapHands(pattern, iBeat, manipulatedRowIdxAfterIBeat, manipulatorRowIdxAfterIBeat) // TODO: is this still needed?



    const manipulatorRowIdxAfterWrap = pattern.adjustRowIdxByTime(patternLength, manipulatorRowIdxAfterIBeat)
    const manipulatedRowIdxAfterWrap = pattern.adjustRowIdxByTime(patternLength, manipulatedRowIdxAfterIBeat)



    // let's find the carry and all throws that are skipped in the original pattern if there is a delay
    let carriedThrow: Throw | undefined = undefined
    const skippedThrows: Throw[] = []
    let lastAnalyzedThrow = interceptedThrow
    let cTimeOffset = 0 // offset relative to iBeat
    let carryThrowTime = iBeat
    let remainingCarryDelay = carryDelay    
    while (remainingCarryDelay !== undefined && remainingCarryDelay >= 0) {
        if (carriedThrow)
            skippedThrows.push(carriedThrow)
        // find the throw caused by the intercept (or the previously skipped carry)
        carriedThrow = pattern.findThrow(pattern.getThrowCauseBeat(lastAnalyzedThrow), lastAnalyzedThrow.toPasserIdxAtCausal)!
        carryThrowTime = iBeat + cTimeOffset
        cTimeOffset = pattern.getThrowCauseTime_(cTimeOffset, carriedThrow.throwLength)
        lastAnalyzedThrow = carriedThrow
        remainingCarryDelay--
    }
    const cBeat = carryDelay !== undefined ? (iBeat + cTimeOffset) % patternLength : undefined
    const manipulatedRowIdxAtCarry = pattern.adjustRowIdxByTime(carryThrowTime, manipulatedRowIdxAfterIBeat)
    if (carryAction) {
        assert(carriedThrow, `carry action ${carryAction} provided, but no throw found to carry`)
        assert(carryAction?.toPasserRole===undefined || carryAction!.toPasserRole! == initialPattern.getToPasserRole(carriedThrow!), `carry's specified target role ${carryAction?.toPasserRole} does not match the identified target role ${initialPattern.getToPasserRole(carriedThrow!)}`)
        // updating the target role for rendering if it was not specified in the notation (I don't like to mutate this, but ...)
        carryAction.toPasserRole = carryAction.toPasserRole ?? initialPattern.getToPasserRole(carriedThrow!)
    }
    const carryMarker: CarryMarker | undefined = carriedThrow ? { 
        kind: 'C', 
        toRoleAtThrow: initialPattern.getToPasserRole(carriedThrow), 
        originalFromRole: initialPattern.getFromPasserRole(carriedThrow!),
        carryDelay: carryDelay!,
        modifiers: carryAction!.modifiers
    } : undefined


    // console.log(pattern.prettyPrintThrows())

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
        const needRedirectTarget = t.toPasserIdxAtCausal === manipulatedRowIdxAfterIBeat && pattern.getThrowCauseBeat(t) >= iBeat
        // also swap for all passes after the period wraps until the carry arrives (includes the carry itself if it wraps)
        const needRedirectTargetWrap = cBeat !== undefined && iBeat + cTimeOffset >= patternLength && t.toPasserIdxAtCausal === manipulatedRowIdxAfterWrap && pattern.getThrowCauseBeat(t) <= cBeat

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
            let toPasserIdxAtCausal = needRedirectTarget ? manipulatorRowIdxAfterIBeat :
                needRedirectTargetWrap ? manipulatorRowIdxAfterWrap : t.toPasserIdxAtCausal
            let markers = t.markers || []
            let throwLength = t.throwLength
            if (isInterceptThrow) {
                const fromRole = pattern.getRole(interceptedThrow.throwBeat, interceptedThrow.fromPasserIdx)
                // special handling of originalFromRole in case of substitutions on the intercepted beat (needed to track positions for animations correctly)
                let originalFromRole = fromRole
                assert((interceptedThrow.markers?.filter(m => m.kind === 'S').length??0) <= 1, `not sure what to do with multiple substitution markers on intercepted throw ${interceptedThrow}`)
                if (interceptedThrow.markers?.filter(m => m.kind === 'S').length===1) {
                    const subMarker = interceptedThrow.markers!.find(m => m.kind === 'S') as SubstitutionMarker
                    assert(subMarker.throw === 'S', `expected to intercept the substituted throw, not the pelf of a substitution, found marker: ${JSON.stringify(subMarker)}`)
                    originalFromRole = subMarker.fromRole
                    const newSubMarker = { ...subMarker, toRoleAtThrow: intercept.manipulatorRole }
                    markers = markers.filter(m => m.kind !== 'S').concat([newSubMarker]) // update sub marker to point to the new target role
                    // unfortuntately, we also need to modify the other sub action (pelf) marker. since the intercept does not affect that throw, we are going to do a somewhat hacky direct replacement here
                    const pelfThrow = pattern.throws.find(t=> t.markers?.find(m => m.kind === 'S' && (m as SubstitutionMarker).throw === 'P' && (m as SubstitutionMarker).uniqueKey === subMarker.uniqueKey))
                    assert(pelfThrow, `could not find pelf throw for intercepted substitution: ${JSON.stringify(subMarker)}`)
                    pattern = pattern.removeThrow(pelfThrow!)
                    const newPelfMarker = { ...(pelfThrow!.markers!.find(m => m.kind === 'S') as SubstitutionMarker), toRoleAtThrow: intercept.manipulatorRole }
                    const newPelfMarkers = pelfThrow!.markers!.filter(m => m.kind !== 'S').concat([newPelfMarker])
                    pattern = pattern.addThrow({
                        ...pelfThrow!,
                        markers: newPelfMarkers
                    })
                }                
                const newMarker: InterceptMarker = { kind: 'I', fromRole, originalFromRole, originalToRoleAtThrow: intercept.toPasserRole, originalThrowLength: throwLength, modifiers: intercept.modifiers }
                markers = [...markers, newMarker]
            }
            if (isCarry) {
                markers = [...markers, carryMarker!]
            }
            if (isSkippedCarry) {
                markers = [...markers, filledMarker]
                // flipCrossing = false
                throwLength = pattern.nrHands
            }
            if (isInterceptThrow && isEarlyIntercept) {
                throwLength = pattern.nrHands / 2
                // flipCrossing = true
                toPasserIdxAtCausal = pattern.samePasserNBeatsLater(toPasserIdxAtCausal, pattern.getThrowCauseBeat(t), throwLength - t.throwLength)
            }
            newThrow = {
                ...t,
                fromPasserIdx,
                toPasserIdxAtCausal: isSkippedCarry ? fromPasserIdx : toPasserIdxAtCausal,
                throwLength,
                markers,
                // note: isInterceptThrow ? 'I' + intercept.manipulatorRole : isFirstCarryableThrow ? 'C' : t.note,
            }
            pattern = pattern.addThrow(newThrow)
            // skipped carry: we already introduced a 2 at the unchanged source (the new manipulator), now we also introduce
            // a 2 at the target of that skipped throw
            if (isSkippedCarry) {
                // if (fromPasserIdx !== toPasserIdx)    
                const beat = Math.floor(pattern.getThrowCauseTime(t) / pattern.getLength())
                pattern = pattern.addThrow({
                    fromPasserIdx: toPasserIdxAtCausal,
                    toPasserIdxAtCausal,
                    fromOppositeHand: pattern.getGlobalHand(0, beat) !== pattern.getThrowHand(t, beat), // where the skipped carry would have landed 
                    flipCrossing: false,
                    throwLength: pattern.nrHands,
                    throwBeat: pattern.getThrowCauseBeat(t),
                    markers: [filledMarker],
                    note: '2'
                })
            }
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

let uniqueMarkerKeyCounter = 0;
function createUniqueMarkerKey(): number {
    return uniqueMarkerKeyCounter++;
}

export function applySubstitution(pattern: Pattern, substitution: SubstitutionAction): Pattern {
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(substitution.manipulatorRole))
        pattern = pattern.addRole(substitution.manipulatorRole)

    // console.log(pattern.prettyPrintThrows())



    // find the substituted throw
    const substitutedThrow = findManipulatedThrow(pattern, substitution)
    assert(substitutedThrow)
    const originalFromRole = pattern.getRole(substitutedThrow.throwBeat, substitutedThrow.fromPasserIdx)
    const originalToRole = pattern.getToPasserRole(substitutedThrow)
    const originalMarkers = substitutedThrow.markers || []

    const isVeryLateSteal = substitution.modifiers.includes('v')

    const pelfLength = isVeryLateSteal ? substitutedThrow.throwLength : pattern.nrHands / 2
    const pelfArrivalBeat = pattern.getThrowCauseBeat_(substitution.beat, pelfLength)
    const manipulatorRowIdxOnPelfArrival = pattern.getRowIdxByRole(pelfArrivalBeat, substitution.manipulatorRole)

    const uniqueMarkerKey = createUniqueMarkerKey();

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
    const newMarkerP: SubstitutionMarker = { kind: 'S', throw: 'P', fromRole: originalFromRole, toRoleAtThrow: originalToRole, modifiers: substitution.modifiers, uniqueKey: uniqueMarkerKey }
    const newMarkersP = [...originalMarkers.filter(m=>m.kind!=='I'), newMarkerP] // remove any intercepts, we intercept only the substituted throw
    pattern = pattern.addThrow({
        ...substitutedThrow,
        // toPasserRole: intercept.manipulatorRole,
        toPasserIdxAtCausal: manipulatorRowIdxOnPelfArrival,
        // isCrossing: pelfLength % pattern.nrHands !== 0,
        flipCrossing: false,
        throwLength: pelfLength,
        markers: newMarkersP,
        note: 'P' + substitution.toPasserRole + ">" + manipulatorRowIdxOnPelfArrival,
    })


    const handinThrowBeat = (substitutedThrow.throwBeat + placementDelay) % pattern.getLength()
    // we assume alternating hands, so for delayed throws we need to adjust the hand
    // let handinThrowHand = (substitutedThrow.fromHand + placementDelay) % 2
    // // in the unusual case that we cross the pattern boundary, we need to check whether we need to map hands -- this is a bit hacky
    // const handinCrossesPatternBoundary = Math.floor((substitutedThrow.throwBeat + placementDelay) / pattern.getLength())
    // assert(handinThrowHand <= 1, "cannot handle delay that wraps around the pattern multiple times")
    // if (handinCrossesPatternBoundary > 0)
    //     handinThrowHand = pattern.mapHands[substitutedThrow.fromPasserIdx][0] ? 1 - handinThrowHand : handinThrowHand
    // const handinIsCrossing = substitutedThrow.isCrossing != (placementDelay % 2 === 1)
    // the substitution is always thrown by the same physical person as who stole the incoming pass, even if the role has changed,
    // however, the row may have changed if the pattern wraps around
    const manipulatorRowIdxOnHandinThrow = pattern.samePasserNBeatsLater(manipulatorRowIdxOnPelfArrival, pelfArrivalBeat, 0 - pattern.getThrowCauseTime_(0, pelfLength) + placementDelay)

    // putting in another club to replace the stolen one
    const updateInterceptMarker = (m: ThrowMarker): ThrowMarker => {
        if (m.kind === 'I') {
            const im = m as InterceptMarker
            return { ...im, fromRole: substitution.manipulatorRole } as InterceptMarker
        }
        return m
    }
    const newMarkerS: SubstitutionMarker = { kind: 'S', throw: 'S', fromRole: originalFromRole, toRoleAtThrow: originalToRole, modifiers: substitution.modifiers, uniqueKey: uniqueMarkerKey }
    const newMarkersS = [...originalMarkers.map(updateInterceptMarker), newMarkerS] // update the origin of the throw in any intercept markers
    pattern = pattern.addThrow({
        ...substitutedThrow,
        fromPasserIdx: manipulatorRowIdxOnHandinThrow,
        // fromHand: handinThrowHand,
        // isCrossing: handinIsCrossing,
        throwLength: substitutedThrow.throwLength - placementDelay,
        throwBeat: handinThrowBeat,
        markers: newMarkersS,
        note: 'S' + substitution.toPasserRole + ">" + substitutedThrow.toPasserIdxAtCausal,
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
    const toPasserIdxAtCausal = pattern.getRowIdxByRole(pattern.getThrowCauseBeat_(t.beat, t.throwLength), t.toPasserRole)
    const manipulatorRowIdx = pattern.getRowIdxByRole(t.beat, t.manipulatorRole)

    const existingManipulatorThrow = pattern.findThrow(t.beat, manipulatorRowIdx, undefined)
    if (existingManipulatorThrow && (existingManipulatorThrow.throwLength === 0 || existingManipulatorThrow.throwLength === 2))
        pattern = pattern.removeThrow(existingManipulatorThrow)
    else {
        assert(!existingManipulatorThrow, `existing throw from manipulator on beat ${t.beat} (${JSON.stringify(existingManipulatorThrow)}) where trying to insert new throw ${t.throwLength}${t.toPasserRole}`)
    }

    pattern = pattern.addThrow({
        fromPasserIdx: manipulatorRowIdx,
        toPasserIdxAtCausal,
        fromOppositeHand: t.fromOppositeHand,
        flipCrossing: t.flipCrossing,
        throwBeat: t.beat,
        throwLength: t.throwLength,
        markers: [baseManipulatorMarker],
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
            assert(!uniqueCheck.has(key), `there are two or more manipulators who attempt to intercept the same throw at the same time (beat ${m.beat}, from ${m.fromPasserRole} to ${m.toPasserRole})`)
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
    if (pattern.nrHands === 4) {
        console.warn(`warning: unclear how to fill gaps in 4 hand patterns, ignored for now`)
        return pattern
    }

    const foundThrown2: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array.from({ length: 2 }, () => Array(pattern.getLength()).fill(undefined)))
    const foundCaught2: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: pattern.nrRows }, () => Array.from({ length: 2 }, () => Array(pattern.getLength()).fill(undefined)))

    // ignore prefix throws for indexing
    for (const t of pattern.throws) if (t.throwBeat >= 0) {
        const hand = pattern.getThrowHand(t, 0)
        foundThrown2[t.fromPasserIdx][hand][t.throwBeat] = t

        const causeBeat = pattern.getThrowCauseBeat(t)
        // if we cross the pattern boundary, consider a pass from a previous period to be the incoming one to get the hands right in the wraparound
        const targetHandInFirstIteration = pattern.getTargetHandFirstIteration(t)
        const to = pattern.getToPasserIdxOnCausal(t)
        foundCaught2[to][targetHandInFirstIteration][causeBeat] = t
    }


    // function onMissingCatch(fn: (rowIdx: number, beat: number) => void, repeat: boolean = false) {
    //     for (let repeat = 0; repeat < (repeat ? pattern.nrRows : 1); repeat++)
    //         for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
    //             for (let beat = 0; beat < pattern.getLength(); beat++)
    //                 if (!foundCaught[rowIdx][beat])
    //                     fn(rowIdx, beat)
    // }
    // function onMissingThrow(fn: (rowIdx: number, beat: number) => void, repeat: boolean = false) {
    //     for (let repeat = 0; repeat < (repeat ? pattern.nrRows : 1); repeat++)
    //         for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
    //             for (let beat = 0; beat < pattern.getLength(); beat++)
    //                 if (!foundThrown[rowIdx][beat])
    //                     fn(rowIdx, beat)
    // }
    function onMissingCatchAndThrow(fn: (rowIdx: number, hand: Hand, beat: number) => boolean, repeat: boolean = false) {
        let changed = false
        for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
            for (const hand of [Hand.Right, Hand.Left])
                for (let beat = 0; beat < pattern.getLength(); beat++)
                    if (foundCaught2[rowIdx][hand][beat] === undefined && foundThrown2[rowIdx][hand][beat] === undefined)
                        changed = fn(rowIdx, hand, beat) || changed
        return changed
    }
    function onCatchWithMissingThrow(fn: (rowIdx: number, hand: Hand, beat: number) => boolean, repeat: boolean = false): boolean {
        let anyChange = false
        let changed = false
        do {
            changed = false
            for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++)
                for (const hand of [Hand.Right, Hand.Left])
                    for (let beat = 0; beat < pattern.getLength(); beat++)
                        if (foundCaught2[rowIdx][hand][beat] !== undefined && foundThrown2[rowIdx][hand][beat] === undefined)
                            changed = fn(rowIdx, hand, beat) || changed
            anyChange = anyChange || changed
        } while (changed && repeat)
        return anyChange
    }

    function insertZipToPriorThrow(rowIdx: number, hand: Hand, beat: number): boolean {
        const beat1BeatEarlier = (beat - pattern.nrHands / 2 + pattern.getLength()) % pattern.getLength()
        const rowIdx1BeatsEarlier = pattern.samePasserNBeatsLater(rowIdx, beat, - pattern.nrHands / 2)

        const potentialThrow = {
            fromPasserIdx: rowIdx,
            fromOppositeHand: pattern.getGlobalHand(0,beat)!==hand,
            flipCrossing: false,
            toPasserIdxAtCausal: rowIdx1BeatsEarlier,
            throwLength: pattern.nrHands / 2,
            throwBeat: beat,
            markers: [filledMarker],
            note: '0'
        }
        const hand1BeatEarlier = pattern.getTargetHandFirstIteration(potentialThrow)

        if (foundCaught2[rowIdx][hand][beat] && !foundThrown2[rowIdx][hand][beat] && !foundCaught2[rowIdx1BeatsEarlier][hand1BeatEarlier][beat1BeatEarlier] && foundThrown2[rowIdx1BeatsEarlier][hand1BeatEarlier][beat1BeatEarlier]) {
            pattern = pattern.addThrow(potentialThrow)
            foundCaught2[rowIdx1BeatsEarlier][hand1BeatEarlier][beat1BeatEarlier] = potentialThrow
            foundThrown2[rowIdx][hand][beat] = potentialThrow
            return true
        }
        return false

    }
    function insertCatchWithEmptyHand(rowIdx: number, hand: Hand, beat: number): boolean {
        const beat2BeatEarlier = (beat - pattern.nrHands + pattern.getLength()) % pattern.getLength()
        const rowIdx2BeatsEarlier = pattern.samePasserNBeatsLater(rowIdx, beat, - pattern.nrHands)

        if (foundCaught2[rowIdx][hand][beat] && !foundThrown2[rowIdx][hand][beat] && !foundCaught2[rowIdx2BeatsEarlier][hand][beat2BeatEarlier]) {
            const newThrow = {
                fromPasserIdx: rowIdx,
                fromOppositeHand: pattern.getGlobalHand(0,beat)!==hand,
                flipCrossing: false,
                toPasserIdxAtCausal: rowIdx2BeatsEarlier,
                throwLength: 0,
                throwBeat: beat,
                markers: [filledMarker],
                note: '0'
            }
            pattern = pattern.addThrow(newThrow)
            foundCaught2[rowIdx2BeatsEarlier][pattern.getTargetHandFirstIteration(newThrow)][beat2BeatEarlier] = newThrow
            foundThrown2[rowIdx][hand][beat] = newThrow
            return true
        }
        return false
    }
    // function insertHoldOnThrowButNoCatch(requireCatch: boolean): (rowIdx: number, beat: number) => void {
    //     return (rowIdx: number, beat: number) => {
    //         const beat2BeatLater = (beat + pattern.nrHands) % pattern.getLength()
    //         const rowIdx2BeatsLater = pattern.samePasserNBeatsLater(rowIdx, beat, pattern.nrHands)

    //         if (foundThrown[rowIdx][beat] && !foundThrown[rowIdx2BeatsLater][beat2BeatLater] && (!requireCatch || foundCaught[rowIdx2BeatsLater][beat2BeatLater])) {
    //             throw new Error('TODO: hand/crossing')
    //             pattern = pattern.addThrow({
    //                 fromPasserIdx: rowIdx2BeatsLater,
    //                 fromHand: 0, isCrossing: true,
    //                 toPasserIdxAtCausal: rowIdx,
    //                 throwLength: 0,
    //                 throwBeat: beat2BeatLater,
    //                 markers: [ThrowType.Filled],
    //                 note: '0'
    //             })
    //             foundThrown[rowIdx2BeatsLater][beat2BeatLater] = true
    //             foundCaught[rowIdx][beat] = true
    //         }
    //     }
    // }
    // function insertZipOnThrowButNoCatch(requireCatch: boolean): (rowIdx: number, beat: number) => void {
    //     return (rowIdx: number, beat: number) => {
    //     const beat1BeatLater = (beat + pattern.nrHands / 2) % pattern.getLength()
    //     const rowIdx1BeatsLater = pattern.samePasserNBeatsLater(rowIdx, beat, pattern.nrHands / 2)

    //     if (foundThrown[rowIdx][beat] && !foundThrown[rowIdx1BeatsLater][beat1BeatLater] && (!requireCatch || foundCaught[rowIdx1BeatsLater][beat1BeatLater])) {
    //         throw new Error('TODO: hand/crossing')
    //         pattern = pattern.addThrow({
    //             fromPasserIdx: rowIdx1BeatsLater,
    //             fromHand: 0, isCrossing: true,
    //             toPasserIdxAtCausal: rowIdx,
    //             throwLength: pattern.nrHands / 2,
    //             throwBeat: beat1BeatLater,
    //             markers: [ThrowType.Filled],
    //             note: 'z'
    //         })
    //         foundThrown[rowIdx1BeatsLater][beat1BeatLater] = true
    //         foundCaught[rowIdx][beat] = true
    //     }
    // }
    // }
    function insertFlipWherePossible(rowIdx: number, hand: Hand, beat: number): boolean {
        // heuristic: only insert flip if other hand is not already throwing/catching and only opposite hand of where catch/throw happened on the last beat
        if (foundThrown2[rowIdx][1 - hand][beat] || foundCaught2[rowIdx][1 - hand][beat]) return false
        const beat1BeatEarlier = (beat - pattern.nrHands / 2 + pattern.getLength()) % pattern.getLength()
        const rowIdx1BeatsEarlier = pattern.samePasserNBeatsLater(rowIdx, beat, - pattern.nrHands / 2)
        if (foundThrown2[rowIdx1BeatsEarlier][hand][beat1BeatEarlier] || foundCaught2[rowIdx1BeatsEarlier][hand][beat1BeatEarlier])
            hand = 1 - hand

        if (!foundThrown2[rowIdx][hand][beat] && !foundCaught2[rowIdx][hand][beat]) {
            const newThrow = {
                fromPasserIdx: rowIdx,
                fromOppositeHand: pattern.getGlobalHand(0,beat)!==hand,
                flipCrossing: false,
                toPasserIdxAtCausal: rowIdx,
                throwLength: pattern.nrHands,
                throwBeat: beat,
                markers: [filledMarker],
                note: 'f'
            }
            pattern = pattern.addThrow(newThrow)
            foundCaught2[rowIdx][hand][beat] = newThrow
            foundThrown2[rowIdx][hand][beat] = newThrow
            return true
        }
        return false
    }

    // console.log("==============================")
    // console.log(pattern.prettyPrintThrows())
    let changed = true
    while (changed) {
        changed = false
        changed = onCatchWithMissingThrow(insertZipToPriorThrow, true) || changed
        changed = onCatchWithMissingThrow(insertCatchWithEmptyHand, false) || changed
        // console.log(pattern.prettyPrintThrows())
    }
    // onMissingCatch(insertHoldOnThrowButNoCatch(true), true)
    // onMissingCatch(insertZipOnThrowButNoCatch(true), true)
    while (changed) {
        changed = false
        changed = onMissingCatchAndThrow(insertFlipWherePossible) || changed

        // onMissingCatch(insertHoldOnThrowButNoCatch(false), true)
        // onMissingCatch(insertZipOnThrowButNoCatch(false), true)
    }
    // console.log("catches", foundCaught)
    // console.log("throws", foundThrown)

    return pattern
}


// function swapHands(pattern: Pattern, beat: number, rowA: number, rowB: number): Pattern {
//     // const oldMapCrossingA = pattern.mapCrossing[rowA]
//     // const oldMapHandsA = pattern.mapHands[rowA]
//     // Swap crossing and hands maps between rows
//     const newMapCrossing = [...pattern.mapCrossing];
//     newMapCrossing[rowA] = pattern.mapCrossing[rowB]
//     newMapCrossing[rowB] = pattern.mapCrossing[rowA]
//     const newMapHands = [...pattern.mapHands];
//     newMapHands[rowA] = pattern.mapHands[rowB]
//     newMapHands[rowB] = pattern.mapHands[rowA]

//     // Return pattern with updated mappings
//     return createPattern(
//         pattern.throws,
//         pattern.nrHands,
//         pattern.mapRows,
//         pattern.roles,
//         newMapHands,
//         newMapCrossing,
//         pattern.initialHands,
//         pattern.getLength()

//     );

// }
