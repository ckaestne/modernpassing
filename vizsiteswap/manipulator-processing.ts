import { TPatternRow } from "./pattern-fromgroup.ts";
import { GroupPattern, Role } from "./pattern-structure.ts";
import { TThrow } from "./pattern-fromsync.ts";
import { Hand } from "./pattern-structure.ts";
import assert from "node:assert";
import { throws } from "node:assert";
import { find } from "@svgdotjs/svg.js";



/**
 * a representation of a pattern (similar to JIF) with various functions for making changes
 * 
 * (this representation does not know about manipulators, so no relabeling in the middle)
 * 
 * immutable
 */
export class Pattern {




    readonly throws: Throw[]
    readonly nrHands: number
    readonly mapRows: number[] // identify the new rowId for each row at the end of the pattern (i.e. classic relabeling)
    readonly roles: [number, Role[]][] // role label for each row after a given beat -- labels are purely decorative; multiple labels can be provided for different beats to highlight the effect of midpattern-relabeling after intercepts
    readonly nrRows: number

    constructor(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [number, Role[]][]) {
        this.throws = throws
        this.nrHands = nrHands
        this.mapRows = mapRows
        if (Array.isArray(roles) && roles.length > 0 && Array.isArray(roles[0])) {
            this.roles = roles as [number, Role[]][]
        } else {
            this.roles = [[0, roles as Role[]]]
        }
        //shortcut
        this.nrRows = mapRows.length
    }


    private length: number | undefined


    findThrow(throwTime: number, fromPasserIdx?: number, toPasserIdx?: number): Throw | undefined {
        let ts = this.findThrows(throwTime, fromPasserIdx, toPasserIdx)
        if (ts.length === 0) return undefined

        if (ts.length > 1) {
            ts = ts.sort((a, b) => b.throwLength - a.throwLength)
            if (ts.filter(t => t.throwLength > 2).length > 1)
                console.warn(`found multiple throws for time ${throwTime} from ${fromPasserIdx} to ${toPasserIdx}, returning the one with the highest throw\n${JSON.stringify(ts)}`)
        }
        return ts[0]
    }

    findThrows(throwTime: number, fromPasserIdx?: number, toPasserIdx?: number): Throw[] {
        let ts = this.throws.filter(t => t.throwTime === throwTime)
        if (fromPasserIdx !== undefined) ts = ts.filter(t => t.fromPasserIdx === fromPasserIdx)
        if (toPasserIdx !== undefined) ts = ts.filter(t => t.toPasserIdx === toPasserIdx)
        return ts
    }

    getRole(beat: number, rowIdx: number): string {
        while (beat >= this.getLength()) {
            rowIdx = this.mapRows[rowIdx]
            beat -= this.getLength()
        }
        while (beat < 0) {
            rowIdx = this.mapRows.findIndex(r => r === rowIdx)
            beat += this.getLength()
        }

        const ls = this.roles.findLast(l => l[0] <= beat)!
        return ls[1][rowIdx]
    }

    /**
     * adjusts a row index for a beat when it wraps around the pattern
     */
    getRowIdxByBeat(beat: number, rowIdx: number): number {
        while (beat >= this.getLength()) {
            rowIdx = this.mapRows[rowIdx]
            beat -= this.getLength()
        }
        while (beat < 0) {
            rowIdx = this.mapRows.findIndex(r => r === rowIdx)
            beat += this.getLength()
        }
        return rowIdx
    }

    prettyPrintThrows(): string {

        let result = ""


        const printThrow = (t: Throw): string => {
            if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${this.getRole(t.throwTime, t.toPasserIdx)}|${t.note}`
            return `${t.throwLength}${this.getRole(t.throwTime, t.toPasserIdx)}`
        }

        const showHeader = true
        // header
        if (showHeader) {
            result += "Beat:\t"

            for (let beat = 0; beat < this.getLength(); beat++) {
                const newRoles = this.roles.find(r => r[0] === beat)
                if (beat !== 0 && newRoles)
                    result += `\t`
                result += beat + "\t"
            }
            result += "\n"
        }


        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++) {
            const myThrows = this.throws.filter(t => t.fromPasserIdx === rowIdx).sort((a, b) => a.throwTime - b.throwTime)
            result = result + `${rowIdx} (${this.getRole(0, rowIdx)}):\t`
            for (let beat = 0; beat < this.getLength(); beat++) {
                const newRoles = this.roles.find(r => r[0] === beat)
                if (beat !== 0 && newRoles)
                    result += `(${newRoles[1][rowIdx]})\t`

                const t = myThrows.filter(t => t.throwTime === beat)
                result += t.map(printThrow).join(",")
                result += "\t"
            }
            result += "-> " + this.getRole(this.getLength(), rowIdx)
            result += "\n"
        }
        return result
    }


    /**
     * assumes that the pattern ends one beat after the last throw
     * @returns 
     */
    getLength(): number {
        if (!this.length) this.length = Math.max(...this.throws.map(t => t.throwTime)) + 1
        return this.length
    }

    getThrowCauseTimeRaw(t: Throw): number {
        return (t.throwTime + t.throwLength - this.nrHands)
    }

    getThrowCauseTimeRaw_(throwTime : number, throwLength: number): number {
        return (throwTime + throwLength - this.nrHands)
    }

    getThrowCauseTime(t: Throw): number {
        return (t.throwTime + t.throwLength - this.nrHands + this.getLength()) % this.getLength()
    }


    addThrow(newThrow: Throw): Pattern {
        const newThrows = [...this.throws, newThrow]
        return new Pattern(newThrows, this.nrHands, this.mapRows, this.roles)
    }
    removeThrow(thatThrow: Throw): Pattern {
        const newThrows = this.throws.filter(t => t !== thatThrow)
        return new Pattern(newThrows, this.nrHands, this.mapRows, this.roles)
    }

    /** 
     * adds a row for a new passer with the provided role
     * 
     * returns the new pattern with the new row at the end
     */
    addRole(newRole: string): Pattern {
        const newRowIdx = this.nrRows
        return new Pattern(this.throws, this.nrHands, [...this.mapRows, newRowIdx], this.roles.map(r => [r[0], [...r[1], newRole]] as [number, Role[]]))
    }

    hasRole(manipulatorRole: string): boolean {
        return this.roles[0][1].indexOf(manipulatorRole) !== -1
    }


    /**
     * identify which row has a given role on a given beat
     */
    getRowIdxByRole(beat: number, role: string): number {
        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++)
            if (this.getRole(beat, rowIdx) === role) return rowIdx

        throw new Error(`no row found for role ${role} at beat ${beat}`)
    }


    /**
     * swap row reindexing at the end of the pattern too
     * and adjusts labeling earlier: at and after a given beat by swapping two roles 
     * 
     */
    swapRoles(beat: number, roleA: string, roleB: string): Pattern {
        assert(beat >= 0 && beat < this.getLength())
        let roles = this.roles.slice()
        let lastRoles = roles.findLast(r => r[0] <= beat)!
        // if there is not already a role setting on that beat, introduce one
        if (lastRoles[0] !== beat) {
            const index = roles.lastIndexOf(lastRoles);
            lastRoles = [beat, [...lastRoles[1]]]
            roles = [
                ...this.roles.slice(0, index + 1),
                lastRoles,
                ...this.roles.slice(index + 1)
            ];
        }
        // relabel by swapping the roles on each instruction on and after the beat
        roles = roles.map(r => {
            if (r[0] < beat) return r
            return [r[0], r[1].map(role => role === roleA ? roleB : role === roleB ? roleA : role)]
        })

        //rows at the beginning of the pattern
        const rowIdxA = lastRoles[1].indexOf(roleA)
        const rowIdxB = lastRoles[1].indexOf(roleB)
        const mapRows = this.mapRows.map((r, i) => i === rowIdxA ? this.mapRows[rowIdxB] : i === rowIdxB ? this.mapRows[rowIdxA] : r)

        return new Pattern(this.throws, this.nrHands, mapRows, roles)
    }

}


export type Throw = {
    fromPasserIdx: number // this is the row corresponding to the first iteration of the pattern; it does not care about relabeling from intercepts, labels can be derived from this
    fromHand: Hand // hand in the first iteration, will be mirrored 2 (sync) or 4 (4hsw) times on odd patterns

    throwTime: number // 0 to pattern length
    // causeTime: number // does wrap around, i.e. always in 0 to pattern length
    throwLength: number

    toPasserIdx: number // this is the row of the receiving passer on the beat that the pass is thrown! (relabeling may happen, but is handled separately)
    toHand: Hand // receiving hand, relative to the throw time (relabeling may cause it to point to the wrong hand if showing only one iteration for odd period patterns/4hsw)

    note: string
}

type ManipulatorAction = InterceptAction | CarryAction | SubstitutionAction | ThrowAction
type InterceptAction = {
    beat: number,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'I'
}
type SubstitutionAction = {
    beat: number,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'S'
}
type ThrowAction = {
    beat: number,
    throwLength: number,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'T'
}
type CarryAction = {
    beat: number,
    toPasserRole?: Role,
    manipulatorRole: Role,
    kind: 'C' // carry
}




/**
 * turns raw input rows into a pattern that can be manipulated
 * supports sync patterns and 4hsiteswaps
 * 
 * @param rawPattern pattern parsed from input
 * @param nrHands number of hands in the pattern (2 or 4)
 * @returns 
 */
export function patternToThrows(rawPattern: TPatternRow[], nrHands: number): [Pattern, ManipulatorAction[]] {
    const roles = rawPattern.map(row => row.role)
    const baseRoles = rawPattern.filter(t => !t.isManipulator).map(row => row.role)
    const baseIdxRelabel: number[] = rawPattern.filter(t => !t.isManipulator).map(t => baseRoles.indexOf(t.relabel ?? t.role))
    const nrBaseRoles = baseRoles.length




    function convert(throwStr: TThrow, who: number, when: number): Throw {
        if (Array.isArray(throwStr)) throw Error("not supporting multiple throws on the same beat for base throws")
        assert(throwStr !== ',', `cannot convert ',' into a throw -- this should have been processed elsewhere`)

        //some magic to parse the throw string
        const throwLengthStr = throwStr[0]
        const throwLength = throwLengthStr.match(/[a-z]/i) ? throwLengthStr.charCodeAt(0) - 87 : Number.parseInt(throwLengthStr)
        assert(throwLength < 12, `unlikely high throw ${throwLengthStr} in ${throwStr}`)
        //by default it's a self
        let to = who
        // if it's a letter after a p, that's the target
        if (throwStr[1] === 'p' && throwStr[2]) to = roles.indexOf(throwStr[2])
        // p without a letter in a two person pattern goes to the other
        else if (throwStr[1] === 'p' && !throwStr[2] && nrBaseRoles === 2) to = 1 - who
        // letter without a p goes to that person
        else if (throwStr.length === 2 && throwStr[1] !== 'p') to = roles.indexOf(throwStr[1])
        // odd number in four-handed siteswap without annotation goes to the other
        else if (throwStr.length === 1 && nrBaseRoles === 2 && nrHands === 4 && throwLength % 2 === 1) to = 1 - who

        assert(to >= 0, `target role not clear for throw  ${throwStr}`)

        return {
            fromPasserIdx: who,
            fromHand: when % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,//assuming hand order rA, rB, rC... lA, lB, lC...

            throwTime: when,
            // causeTime: when + throwLength - nrHands,
            throwLength: Number.parseInt(throwStr),

            toPasserIdx: to,
            toHand: (when + throwLength) % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,

            note: throwStr
        }
    }

    function iterate(c: (currentRowIdx: number, currentRow: TPatternRow, currentThrow: TThrow, beat: number) => void): void {
        assert(nrHands === 2 || nrHands === 4, `only supporting 2 and 4 hands for now`)

        for (let currentRowIdx = 0; currentRowIdx < rawPattern.length; currentRowIdx++) {
            const currentRow = rawPattern[currentRowIdx]
            let beat = 0
            for (let seqIdx = 0; seqIdx < currentRow.sequence.length; seqIdx++) {
                const currentThrow = currentRow.sequence[seqIdx]


                if (currentThrow && currentThrow !== ',' && currentThrow !== '.')
                    c(currentRowIdx, currentRow, currentThrow, nrHands === 4 ? beat * 2 : beat)

                beat += currentThrow === ',' ? .5 : 1
            }
        }
    }

    function getBaseThrows(): Throw[] {
        const result: Throw[] = []
        iterate((currentRowIdx, currentRow, currentThrow, beat) => {
            if (!currentRow.isManipulator)
                result.push(convert(currentThrow, currentRowIdx, beat))
        })
        return result
    }

    function convertManipulatorAction(pattern: Pattern, throwStr: string, whoIdx: number, when: number): ManipulatorAction {
        if (throwStr[0] === 'z') throwStr = (nrHands / 2).toString()
        const who = roles[whoIdx]

        if (['I', 'S'].includes(throwStr[0])) {
            const firstRole: string | undefined = throwStr[1]
            assert(roles.includes(firstRole), `target role ${firstRole} in ${throwStr} not found in ${roles}`)
            let secondRole: string | undefined = undefined
            if (throwStr[2] && throwStr[2].match(/[A-Z]/)) {
                secondRole = throwStr[2]
                assert(roles.includes(secondRole), `target role ${secondRole} in ${throwStr} not found in ${roles}`)
            }
            const fromPasserRole = secondRole ? firstRole : undefined // only defined when both are specified, otherwise single role is assumed to be the target
            const toPasserRole = secondRole ? secondRole : firstRole // 
            // const manipulatedThrow = pattern.findThrow(when, fromRoleIdx, toRoleIdx) // this is the throw that is manipulated
            // assert(manipulatedThrow, `no throw found from ${firstRole} to ${secondRole} for ${throwStr} at ${when}`)

            return {
                kind: throwStr[0] as 'I' | 'S',
                fromPasserRole,
                toPasserRole,
                beat: when,
                manipulatorRole: who,
            }
        } else if (throwStr[0] === 'C') {
            const toPasserRole = throwStr[1] && throwStr[1].match(/[A-Z]/) ? throwStr[1] : undefined
            return {
                kind: 'C',
                toPasserRole,
                beat: when,
                manipulatorRole: who,
            }
        } else {
            const t = convert(throwStr, whoIdx, when)
            return {
                kind: 'T',
                throwLength: t.throwLength,
                toPasserRole: roles[t.toPasserIdx],
                beat: t.throwTime,
                manipulatorRole: who,
            }
        }
    }

    function getManipulatorActions(pattern: Pattern): ManipulatorAction[] {
        const result: ManipulatorAction[] = []
        iterate((currentRowIdx, currentRow, currentThrow, beat) => {
            if (currentRow.isManipulator) {
                if (Array.isArray(currentThrow))
                    result.push(...currentThrow.map(t => convertManipulatorAction(pattern, t, currentRowIdx, beat)))
                else result.push(convertManipulatorAction(pattern, currentThrow, currentRowIdx, beat))
            }
        })
        return result
    }



    const p = new Pattern(getBaseThrows(), nrHands, baseIdxRelabel, baseRoles)
    const m = getManipulatorActions(p)

    return [p, m]
}







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
            const ts = myThrows.filter(t => t.beat === beat)
            result += ts.map(printMAction).join(",")
            result += "\t"
        }
        result += "\n"
    }
    return result
}



export function applyInterceptCarry(pattern: Pattern, intercept: InterceptAction, carry?: CarryAction): Pattern {
    assert(!carry || (intercept.manipulatorRole === carry?.manipulatorRole), `intercept and carry manipulator roles must be the same`)

    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(intercept.manipulatorRole))
        pattern = pattern.addRole(intercept.manipulatorRole)

    // console.log(pattern.prettyPrintThrows())


    // find the intercepted throw
    const toPasserIdx = pattern.getRowIdxByRole(intercept.beat, intercept.toPasserRole)
    const fromPasserIdx = intercept.fromPasserRole ? pattern.getRowIdxByRole(intercept.beat, intercept.fromPasserRole) : undefined
    const interceptedThrow = pattern.findThrow(intercept.beat, fromPasserIdx, toPasserIdx)
    assert(interceptedThrow, `no throw found for ${intercept.beat} from ${fromPasserIdx} to ${toPasserIdx}`)
 
    const iBeatRaw = pattern.getThrowCauseTimeRaw(interceptedThrow)
    const iBeat = pattern.getThrowCauseTime(interceptedThrow)
    assert((carry === undefined) === (interceptedThrow.throwLength <= pattern.nrHands), `carry is required if and only if the intercepted throw is not a flip or zip`)


    const patternLength = pattern.getLength()
    // the row at throwing time and at landing time may not be the same
    const manipulatedPasserIdx = interceptedThrow.toPasserIdx
    const manipulatedPasserIdxOnCausal = pattern.getRowIdxByBeat(iBeatRaw, manipulatedPasserIdx)

    const manipulatorRowIdxOrig = pattern.getRowIdxByRole(intercept.beat,intercept.manipulatorRole)
    // swap labels on the iBeat and relabeling at the end of the pattern
    pattern = pattern.swapRoles(iBeat, pattern.getRole(iBeat, manipulatedPasserIdxOnCausal), intercept.manipulatorRole)
    // <--------------------------------
    // this is more complicated -- wraparound relabels from a prior round must be considerd for the rowIdx, but relabels from this round's intercept must not (only differs for intercepting flips and zips)
    const manipulatorRowIdx = iBeatRaw >= patternLength ? pattern.getRowIdxByBeat(-1, manipulatorRowIdxOrig) : manipulatorRowIdxOrig
    const manipulatorRowIdxOnCausal = pattern.getRowIdxByBeat(iBeatRaw, manipulatorRowIdx)
    // console.log({ iBeatRaw, manipulatorRowIdxOrig, manipulatorRowIdx, manipulatorRowIdxOnCausal })

    // replace old throw with new intercept throw
    pattern = pattern.removeThrow(interceptedThrow)
    pattern = pattern.addThrow({
        ...interceptedThrow,
        // toPasserRole: intercept.manipulatorRole,
        toPasserIdx: manipulatorRowIdx,
        note: 'I' + intercept.toPasserRole + ">" + manipulatorRowIdx,
    })



    // add a 0 if the manipulator does not already do anything on the iBeat
    const manipulatorThrowOnIbeat = pattern.findThrow(iBeatRaw, manipulatorRowIdx)
    // console.log(manipulatorThrowOnIbeat)
    if (!manipulatorThrowOnIbeat)
        pattern = pattern.addThrow({
            fromPasserIdx: manipulatorRowIdxOnCausal, // note: the row of this caused throw may be different from the target row of the intercept if we cross the pattern boundary
            fromHand: interceptedThrow.toHand,
            throwTime: iBeat,
            throwLength: 0,
            toPasserIdx: manipulatorRowIdxOnCausal,
            toHand: interceptedThrow.toHand,
            note: '0'
        })




    // moving all throws of the manipulated passer to the manipulator after the iBeat
    for (let beat = iBeat + 1; beat < patternLength; beat++) {
        const t = pattern.findThrow(beat, manipulatedPasserIdxOnCausal)
        if (t) {
            pattern = pattern.removeThrow(t)
            pattern = pattern.addThrow({
                ...t,
                fromPasserIdx: manipulatorRowIdxOnCausal,
                toPasserIdx: t.toPasserIdx === manipulatedPasserIdxOnCausal ? manipulatorRowIdxOnCausal : t.toPasserIdx,
            })
        }
    }

    // redirect all throws that the intercepted passer still throws (until the ibeat, incl.) from manipulated to manipulator
    for (let beat = interceptedThrow.throwTime+1; beat < iBeatRaw+1; beat++) {
        const t = pattern.findThrow(beat % patternLength, pattern.getRowIdxByBeat(beat, manipulatedPasserIdx))
        
        if (t && t.toPasserIdx === t.fromPasserIdx && pattern.getThrowCauseTimeRaw_(beat, t.throwLength) >= iBeatRaw) {
            pattern = pattern.removeThrow(t)
            pattern = pattern.addThrow({
                ...t,
                toPasserIdx: pattern.getRowIdxByBeat(beat, manipulatorRowIdx),
            })
        }
    }

    // redirect all throws landing after the iBeat from manipulated to manipulator
    for (const t of pattern.throws) {
        if (pattern.getThrowCauseTimeRaw(t) > iBeatRaw && t.toPasserIdx === manipulatedPasserIdxOnCausal && t.throwLength!==0) {
            pattern = pattern.removeThrow(t)
            pattern = pattern.addThrow({
                ...t,
                toPasserIdx: manipulatorRowIdxOnCausal,
            })
        }
    }


    // console.log(pattern.prettyPrintThrows())


    // check and label the carry (do this before redirecting any throws)
    if (carry) {
        // first throw that can be carried is the one from the manipulated passer on the iBeat
        const firstCarryableThrow = pattern.findThrow(iBeat, manipulatedPasserIdxOnCausal)
        assert(firstCarryableThrow, `no throw found for ${iBeat} from ${manipulatedPasserIdxOnCausal} (originally ${manipulatedPasserIdx}), needed for carry computation`)
        pattern = applyCarry(pattern, carry.beat, iBeat, patternLength, iBeat, firstCarryableThrow!, manipulatedPasserIdxOnCausal)
    }



    // console.log(pattern.prettyPrintThrows())

    return pattern
}




/**
 * checks whether the current throw is on the carry beat.
 * if yes, relabel the current throw and make sure the source is a zero
 * if no, mark this throw a hold and continue with the throw forced by this
 * throws exception if there is no valid carry until the pattern gets back to the iBeat
 * 
 * @param throws 
 * @param nrHands 
 * @param carryBeat 
 * @param iBeat 
 * @param patternLength 
 * @param currentBeat 
 * @param firstCarryableThrow 
 */
function applyCarry(pattern: Pattern, carryBeat: number, iBeat: number, patternLength: number, currentBeat: number, firstCarryableThrow: Throw, carryPasserIdxOnCausal: number): Pattern {

    if (currentBeat >= iBeat + patternLength) throw new Error(`carry throw not found before end of the pattern, check whether it is on a valid beat that can be carried`)

    // if we found the carry, it already points to the right place, but we need to relabel it
    if (firstCarryableThrow.throwTime % patternLength === carryBeat) {
        pattern = pattern.removeThrow(firstCarryableThrow)
        pattern = pattern.addThrow({
            ...firstCarryableThrow,
            fromPasserIdx: carryPasserIdxOnCausal,
            // fromPasserRole: carryPasserRole,
            note: 'C' + pattern.getRole(firstCarryableThrow.throwTime, firstCarryableThrow.toPasserIdx) + ">" + firstCarryableThrow.toPasserIdx,
        })
    } else {
        const nextBeat = pattern.getThrowCauseTime(firstCarryableThrow)
        const nextBeatRaw = pattern.getThrowCauseTimeRaw(firstCarryableThrow)
        const nextCarryableThrow = pattern.findThrow(nextBeat, pattern.getRowIdxByBeat(nextBeatRaw, firstCarryableThrow.toPasserIdx))

        // replace the skipped throw with a hold at the source and target
        pattern = pattern.removeThrow(firstCarryableThrow)
        pattern = applyCarry(pattern, carryBeat, iBeat, patternLength, nextBeat, nextCarryableThrow!, pattern.getRowIdxByBeat(nextBeatRaw, carryPasserIdxOnCausal))
        pattern = pattern.addThrow({
            fromPasserIdx: carryPasserIdxOnCausal,
            // fromPasserRole: carryPasserRole,
            toPasserIdx: carryPasserIdxOnCausal,
            // toPasserRole: carryPasserRole,
            throwTime: firstCarryableThrow.throwTime,
            // causeTime: firstCarryableThrow.throwTime,
            throwLength: pattern.nrHands,
            fromHand: firstCarryableThrow.fromHand,
            toHand: firstCarryableThrow.fromHand,
            note: 'hold'
        })
        pattern = pattern.addThrow({
            fromPasserIdx: pattern.getRowIdxByBeat(nextBeatRaw, firstCarryableThrow.toPasserIdx),
            // fromPasserRole: firstCarryableThrow.toPasserRole,
            toPasserIdx: pattern.getRowIdxByBeat(nextBeatRaw, firstCarryableThrow.toPasserIdx),
            // toPasserRole: firstCarryableThrow.toPasserRole,
            throwTime: nextBeat,
            // causeTime: firstCarryableThrow.causeTime,
            throwLength: pattern.nrHands,
            fromHand: firstCarryableThrow.toHand,
            toHand: firstCarryableThrow.toHand,
            note: 'hold'
        })

        return pattern
    }


    return pattern
}


export function applySubstitution(pattern: Pattern, substitution: SubstitutionAction): Pattern {
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(substitution.manipulatorRole))
        pattern = pattern.addRole(substitution.manipulatorRole)

    // console.log(pattern.prettyPrintThrows())

    // find the substituted throw
    // due to limits of the notation, this is not straightforward -- we are looking for a throw thrown on $beat of unknown length that arrives at $toPasserRole which may be relabeled by then
    const manipulatorRowIdx = pattern.getRowIdxByRole(substitution.beat, substitution.manipulatorRole)
    const fromPasserIdx = substitution.fromPasserRole ? pattern.getRowIdxByRole(substitution.beat, substitution.fromPasserRole) : undefined
    const ts = pattern.findThrows(substitution.beat, fromPasserIdx, undefined) // cannot identify target due to possible relabeling
    let substitutedThrow: Throw | undefined = undefined
    for (const t of ts) {
        if (t.toPasserIdx === pattern.getRowIdxByRole(pattern.getThrowCauseTimeRaw(t), substitution.toPasserRole)) {
            substitutedThrow = t
            break
        }
    }
    assert(substitutedThrow, `no throw found for ${substitution.beat} from ${fromPasserIdx} to ${substitution.fromPasserRole}`)

    // replace old throw with new substitution throws
    pattern = pattern.removeThrow(substitutedThrow)
    // adding the throw (pelf) to be stolen
    pattern = pattern.addThrow({
        ...substitutedThrow,
        // toPasserRole: intercept.manipulatorRole,
        fromPasserIdx: manipulatorRowIdx,
        note: 'S' + substitution.toPasserRole + ">" + substitutedThrow.toPasserIdx,
    })
    // putting in another club to replace the stolen one
    pattern = pattern.addThrow({
        ...substitutedThrow,
        // toPasserRole: intercept.manipulatorRole,
        toPasserIdx: manipulatorRowIdx,
        throwLength: pattern.nrHands / 2,
        note: 'P' + substitution.toPasserRole + ">" + manipulatorRowIdx,
    })



    // add a 0 if the manipulator does not already do anything on the receiving beat
    // need to figure out the row, because this could be wrapping around the end of the pattern
    const receivingBeat = substitutedThrow.throwTime - pattern.nrHands / 2
    const receivingManipulatorRowIdx = pattern.getRowIdxByRole(receivingBeat, substitution.manipulatorRole)
    const receivingBeatIdx = (receivingBeat + pattern.getLength()) % pattern.getLength()

    const manipulatorThrowOnReceivingBeat = pattern.findThrow(receivingBeatIdx, manipulatorRowIdx)
    // console.log(manipulatorThrowOnIbeat)
    if (!manipulatorThrowOnReceivingBeat)
        pattern = pattern.addThrow({
            fromPasserIdx: receivingManipulatorRowIdx,
            fromHand: 1 - substitutedThrow.fromHand, // opposite hand of the substituted throw?
            throwTime: receivingBeatIdx,
            throwLength: 0,
            toPasserIdx: receivingManipulatorRowIdx,
            toHand: 1 - substitutedThrow.fromHand,
            note: '0'
        })
    return pattern
}


export function applyManipulatorThrow(pattern: Pattern, t: ThrowAction): Pattern {
    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(t.manipulatorRole))
        pattern = pattern.addRole(t.manipulatorRole)

    // // find the substitued throw
    const toPasserIdx = pattern.getRowIdxByRole(t.beat, t.toPasserRole)
    const manipulatorRowIdx = pattern.getRowIdxByRole(t.beat, t.manipulatorRole)

    const existingManipulatorThrow = pattern.findThrow(t.beat, manipulatorRowIdx, undefined)
    if (existingManipulatorThrow && existingManipulatorThrow.throwLength === 0)
        pattern = pattern.removeThrow(existingManipulatorThrow)
    else
    assert(!existingManipulatorThrow, `existing throw from manipulator on beat ${t.beat} (${JSON.stringify(existingManipulatorThrow)}) where trying to insert new throw ${t.throwLength}${t.toPasserRole}`)

    pattern = pattern.addThrow({
        fromPasserIdx: manipulatorRowIdx,
        toPasserIdx,
        fromHand: 0, // TODO: hand unclear!
        toHand: 0, // TODO: hand unclear!
        throwTime: t.beat,
        throwLength: t.throwLength,
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
    
    

    const interceptCarryPairs: [InterceptAction, CarryAction|undefined][] = []
    // need to match intercepts and carries where there may be multiple pairs in a row and a row may start with a wraparound carry
    for (const manipulatorRole of manipulatorRoles) {
        const actions = manipulations.filter(m => m.manipulatorRole === manipulatorRole && ['I','C'].includes(m.kind)).sort((a, b) => a.beat - b.beat)
        if (actions.length === 0) continue
        if (actions[0].kind === 'C') actions.push(actions.shift()!)
        while (actions.length > 0) {
            const intercept = actions.shift()!
            assert(intercept.kind === 'I', `intercept expected, but found ${intercept.kind} for ${manipulatorRole} at ${intercept.beat}`)
            if (actions.length>0 && actions[0].kind === 'C') 
                interceptCarryPairs.push([intercept, actions.shift() as CarryAction])
            else
                interceptCarryPairs.push([intercept, undefined])
        }
    }

    interceptCarryPairs.sort((a, b) => a[0].beat - b[0].beat)
    for (const [intercept, carry] of interceptCarryPairs) {
        pattern = applyInterceptCarry(pattern, intercept, carry)
    }

    for (const m of manipulations) {
        if (m.kind === 'S') pattern = applySubstitution(pattern, m)
    }
    for (const m of manipulations) {
        if (m.kind === 'T') pattern = applyManipulatorThrow(pattern, m)
    }




  
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
