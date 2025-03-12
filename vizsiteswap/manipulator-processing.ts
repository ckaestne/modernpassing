import { TPatternRow } from "./pattern-fromgroup.ts";
import {  Role } from "./pattern-structure.ts";
import { TThrow } from "./pattern-fromsync.ts";
import assert from "node:assert";


// beat is always 0 ... pattern length
type Beat = number
// time can exceed the boundaries of a pattern in both directions
type Time = number


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
    readonly roles: [Beat, Role[]][] // role label for each row after a given beat -- labels are purely decorative; multiple labels can be provided for different beats to highlight the effect of midpattern-relabeling after intercepts; always has at least one entry for beat 0 which is always first in the array
    readonly nrRows: number

    constructor(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][]) {
        this.throws = throws
        this.nrHands = nrHands
        this.mapRows = mapRows
        if (Array.isArray(roles) && roles.length > 0 && Array.isArray(roles[0])) {
            this.roles = roles as [Beat, Role[]][]
        } else {
            this.roles = [[0, roles as Role[]]]
        }
        //shortcut
        this.nrRows = mapRows.length
    }


    private length: number | undefined


    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdx?: number): Throw | undefined {
        assert(throwBeat >= 0 && throwBeat < this.getLength())
        let ts = this.findThrows(throwBeat, fromPasserIdx, toPasserIdx)
        if (ts.length === 0) return undefined

        if (ts.length > 1) {
            ts = ts.sort((a, b) => b.throwLength - a.throwLength)
            if (ts.filter(t => t.throwLength > 2).length > 1)
                console.warn(`found multiple throws for time ${throwBeat} from ${fromPasserIdx} to ${toPasserIdx}, returning the one with the highest throw\n${JSON.stringify(ts)}`)
        }
        return ts[0]
    }

    findThrows(throwBeat: Beat, fromPasserIdx?: number, toPasserIdx?: number): Throw[] {
        assert(throwBeat >= 0 && throwBeat < this.getLength())
        let ts = this.throws.filter(t => t.throwBeat === throwBeat)
        if (fromPasserIdx !== undefined) ts = ts.filter(t => t.fromPasserIdx === fromPasserIdx)
        if (toPasserIdx !== undefined) ts = ts.filter(t => t.toPasserIdx === toPasserIdx)
        return ts
    }

    findThrowsByRole(beat: Beat, fromRole?: Role, toRole?: Role): Throw[] {
        // due to limits of the notation, this is not straightforward --
        // we are looking for a throw thrown on $beat of unknown length that arrives at $toPasserRole which may be relabeled by then

        const fromPasserIdx = fromRole ? this.getRowIdxByRole(beat, fromRole) : undefined
        const ts = this.findThrows(beat, fromPasserIdx, undefined) // cannot identify target due to possible relabeling
        if (toRole)
            return ts.filter(t =>
                t.toPasserIdx === this.getRowIdxByRole(this.getThrowCauseTime(t), toRole))
        else return ts
    }


    /**
     * gets the role of a row on a given beat
     * 
     * if the beat is < 0 or > pattern length, it 
     * wraps around the pattern, considering the rearrangement of
     * rows
     */
    getRole(time: Time, rowIdx: number): string {
        while (time >= this.getLength()) {
            rowIdx = this.mapRows[rowIdx]
            time -= this.getLength()
        }
        while (time < 0) {
            rowIdx = this.mapRows.findIndex(r => r === rowIdx)
            time += this.getLength()
        }

        const ls = this.roles.findLast(l => l[0] <= time)!
        return ls[1][rowIdx]
    }


    /**
     * adjusts a row index for a time when it wraps around the pattern
     * 
     * (i.e., relabeling at end of pattern, not due to intercept swaps)
     */
    adjustRowIdxByTime(time: Time, rowIdx: number): number {
        while (time >= this.getLength()) {
            rowIdx = this.mapRows[rowIdx]
            time -= this.getLength()
        }
        while (time < 0) {
            rowIdx = this.mapRows.findIndex(r => r === rowIdx)
            time += this.getLength()
        }
        return rowIdx
    }



    prettyPrintThrows(): string {

        let result = ""


        const printThrow = (t: Throw): string => {
            // if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${this.getRole(t.throwBeat, t.toPasserIdx)}|${t.note}`
            const fromRole = this.getRole(t.throwBeat, t.fromPasserIdx)
            const toRole = this.getRole(this.getThrowCauseBeat(t), t.toPasserIdx)
            // const printRole = fromRole !== toRole ? toRole : ""
            const printType = t.type === ThrowType.Base ? "" : "|" + t.type
            return `${t.throwLength}${toRole}_${t.toPasserIdx}${printType}`
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
            const myThrows = this.throws.filter(t => t.fromPasserIdx === rowIdx).sort((a, b) => a.throwBeat - b.throwBeat)
            result = result + `${rowIdx} (${this.getRole(0, rowIdx)}):\t`
            for (let beat = 0; beat < this.getLength(); beat++) {
                const newRoles = this.roles.find(r => r[0] === beat)
                if (beat !== 0 && newRoles)
                    result += `(${newRoles[1][rowIdx]})\t`

                const t = myThrows.filter(t => t.throwBeat === beat)
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
        if (!this.length) this.length = Math.max(...this.throws.map(t => t.throwBeat)) + 1
        return this.length
    }

    getThrowCauseTime(t: Throw): number {
        return t.throwBeat + t.throwLength - this.nrHands
    }

    getThrowCauseTime_(throwTime: number, throwLength: number): number {
        return throwTime + throwLength - this.nrHands
    }

    getThrowCauseBeat(t: Throw): number {
        return (t.throwBeat + t.throwLength - this.nrHands + this.getLength()) % this.getLength()
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
     * identify which row has a given role on a given beat,
     * 
     * considers rearranging rows at the end of the pattern
     */
    getRowIdxByRole(time: Time, role: string): number {
        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++)
            if (this.getRole(time, rowIdx) === role) return rowIdx

        throw new Error(`no row found for role ${role} at beat ${time}`)
    }



    /**
     * swap row reindexing at the end of the pattern too
     * and adjusts labeling earlier: at and after a given beat by swapping two roles 
     * 
     */
    swapRoles(beat: Beat, roleA: string, roleB: string): Pattern {
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

        //relevant rows before swapping
        const rowIdxA = lastRoles[1].indexOf(roleA)
        const rowIdxB = lastRoles[1].indexOf(roleB)

        // relabel by swapping the roles on each instruction on and after the beat
        roles = roles.map(r => {
            if (r[0] < beat) return r
            const newR = r[1].slice()
            newR[rowIdxA] = r[1][rowIdxB]
            newR[rowIdxB] = r[1][rowIdxA]
            return [r[0], newR]
        })

        const mapRows = this.mapRows.map((r, i) => i === rowIdxA ? this.mapRows[rowIdxB] : i === rowIdxB ? this.mapRows[rowIdxA] : r)

        return new Pattern(this.throws, this.nrHands, mapRows, roles)
    }




}


export type Throw = {
    fromPasserIdx: number // this is the row corresponding to the first iteration of the pattern; it does not care about relabeling from intercepts, labels can be derived from this
    // fromPasserRole = pattern.getRole(this.throwBeat, this.fromPasserIdx)
    // fromHand: Hand // hand in the first iteration, will be mirrored 2 (sync) or 4 (4hsw) times on odd patterns

    throwBeat: Beat // 0 to pattern length
    // causeTime: number // does wrap around, i.e. always in 0 to pattern length
    throwLength: number

    toPasserIdx: number // this is the row of the receiving passer on the causal beat (which may involve relabeling at the end of the row, so a self might go to a different row)
    // toPasserRole = pattern.getRole(pattern.getCausalTime(this), this.toPasserIdx)
    // toHand: Hand // receiving hand, relative to the throw time (relabeling may cause it to point to the wrong hand if showing only one iteration for odd period patterns/4hsw)

    type: ThrowType,
    note: string
}
enum ThrowType {
    Base = 'B',
    BaseManipulator = 'M', // normal throw from the manipulator (not a substitution or intercept or carry)
    SubstitutionPelf = 'P',
    SubstitutionPlacement = 'S',
    Intercept = 'I',
    Carry = 'C',
    Filled = 'F', // automatically filled non-actions or automated actions (hold or empty hand or zip)
}


export type ManipulatorAction = InterceptAction | CarryAction | SubstitutionAction | ThrowAction
export type InterceptAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'I'
    modifiers: string
}
export type SubstitutionAction = {
    beat: Beat,
    fromPasserRole?: Role,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'S'
    modifiers: string
}
export type ThrowAction = {
    beat: Beat,
    throwLength: number,
    toPasserRole: Role,
    manipulatorRole: Role,
    kind: 'T'
}
export type CarryAction = {
    beat: Beat,
    toPasserRole?: Role,
    manipulatorRole: Role,
    kind: 'C' // carry
}


function getPatternLength(rawPattern: TPatternRow[], nrHands: number): number {
    function getRowLength(row: TPatternRow): number {
        if (nrHands === 2) {
            assert(!row.sequence.includes(','))
            return row.sequence.length
        }
        if (nrHands === 4) {
            const halfs = row.sequence.filter(t => t === ',').length
            const negs = row.sequence.filter(t => t === '\'').length
            return (row.sequence.length - halfs - negs) * 2 - 1 + halfs - negs
        }
        throw new Error(`only supporting 2 and 4 hands for now`)
    }
    return rawPattern.map(getRowLength).reduce((a, b) => Math.max(a, b), 0)

}



/**
 * turns raw input rows into a pattern that can be manipulated
 * supports sync patterns and 4hsiteswaps
 * 
 * @param rawPattern pattern parsed from input
 * @param nrHands number of hands in the pattern (2 or 4)
 * @returns 
 */
export function createPatternFromRaw(rawPattern: TPatternRow[], nrHands: number): [Pattern, ManipulatorAction[]] {
    const roles = rawPattern.map(row => row.role)
    const baseRoles = rawPattern.filter(t => !t.isManipulator).map(row => row.role)
    const baseIdxRelabel: number[] = rawPattern.filter(t => !t.isManipulator).map(t => baseRoles.indexOf(t.relabel ?? t.role))
    const nrBaseRoles = baseRoles.length
    const patternLength = getPatternLength(rawPattern, nrHands)



    function relabel(time: Time, rowIdx: number): number {
        // no manipulators yet, so relabeling is pretty straightforward for now
        while (time >= patternLength) {
            rowIdx = baseIdxRelabel[rowIdx]
            time -= patternLength
        }
        while (time < 0) {
            rowIdx = baseIdxRelabel.findIndex(r => r === rowIdx)
            time += patternLength
        }
        return rowIdx
    }

    function convert(throwStr: TThrow, who: number, when: Beat): Throw {
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
        const causeTime = when + throwLength - nrHands

        return {
            fromPasserIdx: who,
            // fromHand: when % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,//assuming hand order rA, rB, rC... lA, lB, lC...

            throwBeat: when,
            throwLength,

            toPasserIdx: relabel(causeTime, to),
            // toHand: (when + throwLength) % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,

            type: ThrowType.Base,
            note: throwStr
        }
    }

    function iterate(c: (currentRowIdx: number, currentRow: TPatternRow, currentThrow: TThrow, beat: Beat) => void): void {
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

    function convertManipulatorAction(pattern: Pattern, throwStr: string, whoIdx: number, when: Beat): ManipulatorAction {
        if (throwStr[0] === 'z') throwStr = (nrHands / 2).toString()
        const who = roles[whoIdx]

        if (['I', 'S'].includes(throwStr[0])) {
            const firstRole: string | undefined = throwStr[1]
            assert(roles.includes(firstRole), `target role ${firstRole} in ${throwStr} not found in ${roles}`)
            let modifiers = throwStr.slice(2)
            let secondRole: string | undefined = undefined
            if (throwStr[2] && throwStr[2].match(/[A-Z]/)) {
                secondRole = throwStr[2]
                modifiers = modifiers.slice(1)
                assert(roles.includes(secondRole), `target role ${secondRole} in ${throwStr} not found in ${roles}`)
            }
            const fromPasserRole = secondRole ? firstRole : undefined // only defined when both are specified, otherwise single role is assumed to be the target
            const toPasserRole = secondRole ? secondRole : firstRole // 
            checkModifiers(throwStr[0] as 'I' | 'S', modifiers)
            // const manipulatedThrow = pattern.findThrow(when, fromRoleIdx, toRoleIdx) // this is the throw that is manipulated
            // assert(manipulatedThrow, `no throw found from ${firstRole} to ${secondRole} for ${throwStr} at ${when}`)

            return {
                kind: throwStr[0] as 'I' | 'S',
                fromPasserRole,
                toPasserRole,
                beat: when,
                manipulatorRole: who,
                modifiers
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
                beat: t.throwBeat,
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
    assert(!carry || (intercept.manipulatorRole === carry?.manipulatorRole), `intercept and carry manipulator roles must be the same`)

    // if the pattern does not already have the manipulator role's row -- add it
    if (!pattern.hasRole(intercept.manipulatorRole))
        pattern = pattern.addRole(intercept.manipulatorRole)
    const patternLength = pattern.getLength()

    // console.log(pattern.prettyPrintThrows())


    // find the intercepted throw
    // find the substituted throw
    const interceptedThrowCandidates = pattern.findThrowsByRole(intercept.beat, intercept.fromPasserRole, intercept.toPasserRole)
    assert(interceptedThrowCandidates.length >= 0, `no throw found to intercept on ${intercept.beat} from ${intercept.fromPasserRole} to ${intercept.toPasserRole}`)
    assert(interceptedThrowCandidates.length < 2, `intercept throw ambiguous, found multiple on ${intercept.beat} from ${intercept.fromPasserRole} to ${intercept.toPasserRole}`)
    let interceptedThrow = interceptedThrowCandidates[0]


    const iTime = pattern.getThrowCauseTime(interceptedThrow)
    const iBeat = pattern.getThrowCauseBeat(interceptedThrow)
    assert((carry === undefined) === (interceptedThrow.throwLength <= pattern.nrHands), `carry is required if and only if the intercepted throw is not a flip or zip`)

    // note, we are using manipulator and manipulated roles before the rows switch, that is manipulatorRowIdxAfterIBeat is the row of the manipulator before switching, where the manipulated will be after switching)
    const manipulatedRole = intercept.toPasserRole

    const manipulatorRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, intercept.manipulatorRole)
    const manipulatedRowIdxAfterIBeat = pattern.getRowIdxByRole(iBeat, manipulatedRole)

    let firstCarryableThrow = pattern.findThrow(iBeat, pattern.adjustRowIdxByTime(iTime, manipulatedRowIdxAfterIBeat))

    for (const t of pattern.throws) {

        // get all passes that arrive to the manipulated passer on or after iTime
        const needRedirectTarget = t.toPasserIdx === manipulatedRowIdxAfterIBeat && pattern.getThrowCauseTime(t) >= iTime && pattern.getThrowCauseTime(t) < patternLength
        // get all passes thrown by the manipulated passer on or after iTime (TODO: iBeat?)
        let needRedirectSource = t.fromPasserIdx === manipulatedRowIdxAfterIBeat && t.throwBeat >= iBeat
        const isFirstCarryableThrow = t === firstCarryableThrow
        const isInterceptThrow = t === interceptedThrow
        if (isFirstCarryableThrow) needRedirectSource = false // this is the throw that is not yet forced, so it will be the first carryable throw

        let newThrow = t
        if (needRedirectSource || needRedirectTarget) {
            pattern = pattern.removeThrow(t)
            newThrow = {
                ...t,
                fromPasserIdx: needRedirectSource ? manipulatorRowIdxAfterIBeat : t.fromPasserIdx,
                toPasserIdx: needRedirectTarget ? manipulatorRowIdxAfterIBeat : t.toPasserIdx,
                type: isInterceptThrow ? ThrowType.Intercept : isFirstCarryableThrow ? ThrowType.Carry : t.type,
                // note: isInterceptThrow ? 'I' + intercept.manipulatorRole : isFirstCarryableThrow ? 'C' : t.note,
            }
            pattern = pattern.addThrow(newThrow)
        }
        if (isFirstCarryableThrow) firstCarryableThrow = newThrow
        if (isInterceptThrow) interceptedThrow = newThrow
    }

    const isEarlyIntercept = intercept.modifiers.includes('e') || intercept.modifiers.includes('l')
    assert(!isEarlyIntercept, "not yet supported")

    // swap labels on the iBeat and relabeling at the end of the pattern
    pattern = pattern.swapRoles(iBeat, manipulatedRole, intercept.manipulatorRole)


    // add a 0 if the manipulator does not already do anything on the iBeat
    const insert0Beat = isEarlyIntercept ? intercept.beat - pattern.nrHands / 2 : iTime
    const mRowAt0Beat = pattern.adjustRowIdxByTime(insert0Beat, manipulatorRowIdxAfterIBeat)
    const manipulatorThrowOn0Beat = pattern.findThrow((insert0Beat + patternLength) % patternLength, mRowAt0Beat)
    // console.log(manipulatorThrowOnIbeat)
    if (!manipulatorThrowOn0Beat) {
        const throwBeat = (insert0Beat + patternLength) % patternLength
        const arrivalTime = pattern.getThrowCauseTime_(throwBeat, 0)
        pattern = pattern.addThrow({
            fromPasserIdx: mRowAt0Beat, // note: the row of this caused throw may be different from the target row of the intercept if we cross the pattern boundary
            // fromHand: interceptedThrow.toHand,
            throwBeat,
            throwLength: 0,
            toPasserIdx: pattern.adjustRowIdxByTime(arrivalTime, mRowAt0Beat),
            // toHand: interceptedThrow.toHand,
            type: ThrowType.Filled,
            note: '0'
        })
    }





    // // redirect all passes originally to the manipulated passer to the prior manipulator who now has that role
    // for (const t of passesToManipulated) {
    //     pattern = pattern.removeThrow(t)
    //     pattern = pattern.addThrow({
    //         ...t,
    //         toPasserIdx: pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), manipulatedRole),
    //     })
    // }
    // // redirect all passes originally from the manipulated passer to the prior manipulator who now has that role
    // for (const t of passesFromManipulated) {
    //     pattern = pattern.removeThrow(t)
    //     pattern = pattern.addThrow({
    //         ...t,
    //         fromPasserIdx: pattern.getRowIdxByRole(t.throwBeat, manipulatedRole),
    //     })
    // }



    // 
    // // the row at throwing time and at landing time may not be the same
    // const manipulatedPasserRole = intercept.toPasserRole


    // // const manipulatorRowIdxOrig = pattern.getRowIdxByRole(intercept.beat, intercept.manipulatorRole)
    // // // <--------------------------------
    // // // this is more complicated -- wraparound relabels from a prior round must be considerd for the rowIdx, but relabels from this round's intercept must not (only differs for intercepting flips and zips)
    // // const manipulatorRowIdx = iTime >= patternLength ? pattern.adjustRowIdxByTime(-1, manipulatorRowIdxOrig) : manipulatorRowIdxOrig
    // // const manipulatorRowIdxOnCausal = pattern.adjustRowIdxByTime(iTime, manipulatorRowIdx)
    // // // console.log({ iBeatRaw, manipulatorRowIdxOrig, manipulatorRowIdx, manipulatorRowIdxOnCausal })

    // // replace old throw with new intercept throw
    // pattern = pattern.removeThrow(interceptedThrow)
    // const manipulatorRowIdxAtITime = pattern.getRowIdxByRole(iTime, manipulatedPasserRole)
    // if (!isEarlyIntercept)
    //     // default very late intercept arrives at the time of the original throw
    //     pattern = pattern.addThrow({
    //         ...interceptedThrow,
    //         // toPasserRole: intercept.manipulatorRole,
    //         toPasserIdx: manipulatorRowIdxAtITime,
    //         type: ThrowType.Intercept,
    //         note: 'I' + intercept.toPasserRole + ">" + manipulatorRowIdxAtITime,
    //     })
    // else
    //     //early/late, but not very late intercept modeled as a 1p takeout
    //     pattern = pattern.addThrow({
    //         ...interceptedThrow,
    //         // toPasserRole: intercept.manipulatorRole,
    //         toPasserIdx: manipulatorRowIdxAtITime,
    //         throwLength: pattern.nrHands / 2,
    //         type: ThrowType.Intercept,
    //         note: 'I' + intercept.toPasserRole + ">" + manipulatorRowIdxAtITime,
    //     })







    // // moving all throws of the manipulated passer between the swap and the end of the pattern to the manipulator 
    // // (after the end of the pattern, the relabeling takes care of this swap)
    // for (let beat = iBeat + 1; beat < patternLength; beat++) {
    //     const ts = pattern.findThrowsByRole(beat, intercept.manipulatorRole)
    //     for (const t of ts) {
    //         pattern = pattern.removeThrow(t)
    //         const newManipulatorRowIdxAtCausal = pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), intercept.manipulatorRole)
    //         const priorManipulatorRowIdxAtThrow = pattern.getRowIdxByRole(t.throwBeat, manipulatedPasserRole)
    //         const priorManipulatorRowIdxOnCausal  = pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), manipulatedPasserRole)
    //         pattern = pattern.addThrow({
    //             ...t,
    //             fromPasserIdx: priorManipulatorRowIdxAtThrow,
    //             toPasserIdx: t.toPasserIdx === newManipulatorRowIdxAtCausal ? priorManipulatorRowIdxOnCausal : t.toPasserIdx,
    //         })
    //     }
    // }

    // console.log(pattern.prettyPrintThrows())

    // // redirect all throws that the intercepted passer still throws before the iTime from manipulated to manipulator (which may wrap around!)
    // for (let time = interceptedThrow.throwBeat + 1; time < iTime; time++) {
    //     const t = pattern.findThrow(time % patternLength, pattern.getRowIdxByRole(time, manipulatedPasserRole))

    //     if (t && t.toPasserIdx === t.fromPasserIdx && pattern.getThrowCauseTime_(time, t.throwLength) >= iTime) {
    //         pattern = pattern.removeThrow(t)
    //         pattern = pattern.addThrow({
    //             ...t,
    //             toPasserIdx: pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), intercept.manipulatorRole),
    //         })
    //     }
    // }
    // // the throw at the manipulated passer at iTime is the one that is not forced yet and that will be the first carryable throw
    // // this one gets redirected from manipulated to manipulator
    // const firstCarryableThrow = pattern.findThrow(iBeat, manipulatedRowIdxAtITime)


    // console.log(pattern.prettyPrintThrows())

    // // redirect all throws landing after the iBeat from manipulated to manipulator
    // for (const t of pattern.throws) {
    //     if (pattern.getThrowCauseTime(t) > iTime && pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), manipulatedPasserRole) && t.throwLength !== 0) {
    //         pattern = pattern.removeThrow(t)
    //         pattern = pattern.addThrow({
    //             ...t,
    //             toPasserIdx: pattern.getRowIdxByRole(pattern.getThrowCauseTime(t), intercept.manipulatorRole),
    //         })
    //     }
    // }


    // // console.log(pattern.prettyPrintThrows())


    // // check and label the carry (do this before redirecting any throws)
    // if (carry) {
    //     // first throw that can be carried is the one from the manipulated passer on the iBeat (that would have been caused by the now-intercepted throw)
    //     assert(firstCarryableThrow, `no throw found for ${iBeat} from ${manipulatedRowIdxAtITime}, needed for carry computation`)
    //     pattern = applyCarry(pattern, carry.beat, iBeat, patternLength, iBeat, firstCarryableThrow!, manipulatedRowIdxAtITime)
    // }



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
    if (firstCarryableThrow.throwBeat % patternLength === carryBeat) {
        pattern = pattern.removeThrow(firstCarryableThrow)
        pattern = pattern.addThrow({
            ...firstCarryableThrow,
            fromPasserIdx: carryPasserIdxOnCausal,
            // fromPasserRole: carryPasserRole,
            type: ThrowType.Carry,
            note: 'C' + pattern.getRole(firstCarryableThrow.throwBeat, firstCarryableThrow.toPasserIdx) + ">" + firstCarryableThrow.toPasserIdx,
        })
    } else {
        const nextBeat = pattern.getThrowCauseBeat(firstCarryableThrow)
        const nextBeatRaw = pattern.getThrowCauseTime(firstCarryableThrow)
        const nextCarryableThrow = pattern.findThrow(nextBeat, pattern.adjustRowIdxByTime(nextBeatRaw, firstCarryableThrow.toPasserIdx))

        // replace the skipped throw with a hold at the source and target
        pattern = pattern.removeThrow(firstCarryableThrow)
        pattern = applyCarry(pattern, carryBeat, iBeat, patternLength, nextBeat, nextCarryableThrow!, pattern.adjustRowIdxByTime(nextBeatRaw, carryPasserIdxOnCausal))
        pattern = pattern.addThrow({
            fromPasserIdx: carryPasserIdxOnCausal,
            // fromPasserRole: carryPasserRole,
            toPasserIdx: carryPasserIdxOnCausal,
            // toPasserRole: carryPasserRole,
            throwBeat: firstCarryableThrow.throwBeat,
            // causeTime: firstCarryableThrow.throwTime,
            throwLength: pattern.nrHands,
            // fromHand: firstCarryableThrow.fromHand,
            // toHand: firstCarryableThrow.fromHand,
            type: ThrowType.Filled,
            note: 'hold'
        })
        pattern = pattern.addThrow({
            fromPasserIdx: pattern.adjustRowIdxByTime(nextBeatRaw, firstCarryableThrow.toPasserIdx),
            // fromPasserRole: firstCarryableThrow.toPasserRole,
            toPasserIdx: pattern.adjustRowIdxByTime(nextBeatRaw, firstCarryableThrow.toPasserIdx),
            // toPasserRole: firstCarryableThrow.toPasserRole,
            throwBeat: nextBeat,
            // causeTime: firstCarryableThrow.causeTime,
            throwLength: pattern.nrHands,
            // fromHand: firstCarryableThrow.toHand,
            // toHand: firstCarryableThrow.toHand,
            type: ThrowType.Filled,
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


    const manipulatorRowIdx = pattern.getRowIdxByRole(substitution.beat, substitution.manipulatorRole)

    // find the substituted throw
    const substitutedThrowCandidates = pattern.findThrowsByRole(substitution.beat, substitution.fromPasserRole, substitution.toPasserRole)
    assert(substitutedThrowCandidates.length >= 0, `no throw found for ${substitution.beat} from ${substitution.fromPasserRole} to ${substitution.toPasserRole}`)
    assert(substitutedThrowCandidates.length < 2, `substitution throw ambiguous, found multiple for ${substitution.beat} from ${substitution.fromPasserRole} to ${substitution.toPasserRole}`)
    const substitutedThrow = substitutedThrowCandidates[0]

    // replace old throw with new substitution throws
    pattern = pattern.removeThrow(substitutedThrow)

    const isVeryLateSteal = substitution.modifiers.includes('v')
    const isDeplayedPlacement = substitution.modifiers.includes('d')

    // adding the throw (pelf) to be stolen
    if (!isVeryLateSteal)
        pattern = pattern.addThrow({
            ...substitutedThrow,
            // toPasserRole: intercept.manipulatorRole,
            toPasserIdx: manipulatorRowIdx,
            throwLength: pattern.nrHands / 2,
            type: ThrowType.SubstitutionPelf,
            note: 'P' + substitution.toPasserRole + ">" + manipulatorRowIdx,
        })
    else
        pattern = pattern.addThrow({
            ...substitutedThrow,
            // toPasserRole: intercept.manipulatorRole,
            toPasserIdx: manipulatorRowIdx,
            type: ThrowType.SubstitutionPelf,
            note: 'P' + substitution.toPasserRole + ">" + manipulatorRowIdx,
        })


    // putting in another club to replace the stolen one
    if (!isDeplayedPlacement)
        pattern = pattern.addThrow({
            ...substitutedThrow,
            // toPasserRole: intercept.manipulatorRole,
            fromPasserIdx: manipulatorRowIdx,
            type: ThrowType.SubstitutionPlacement,
            note: 'S' + substitution.toPasserRole + ">" + substitutedThrow.toPasserIdx,
        })
    else
        pattern = pattern.addThrow({
            ...substitutedThrow,
            fromPasserIdx: manipulatorRowIdx,
            throwLength: pattern.nrHands / 2,
            throwBeat: substitutedThrow.throwBeat + substitutedThrow.throwLength - pattern.nrHands / 2,
            type: ThrowType.SubstitutionPlacement,
            note: 'S' + substitution.toPasserRole + ">" + substitutedThrow.toPasserIdx,
        })



    // add a 0 if the manipulator does not already do anything on the receiving beat
    // need to figure out the row, because this could be wrapping around the end of the pattern
    const receivingBeat = substitutedThrow.throwBeat - pattern.nrHands / 2
    const receivingManipulatorRowIdx = pattern.getRowIdxByRole(receivingBeat, substitution.manipulatorRole)
    const receivingBeatIdx = (receivingBeat + pattern.getLength()) % pattern.getLength()

    const manipulatorThrowOnReceivingBeat = pattern.findThrow(receivingBeatIdx, manipulatorRowIdx)
    // console.log(manipulatorThrowOnIbeat)
    if (!manipulatorThrowOnReceivingBeat)
        pattern = pattern.addThrow({
            fromPasserIdx: receivingManipulatorRowIdx,
            // fromHand: 1 - substitutedThrow.fromHand, // opposite hand of the substituted throw?
            throwBeat: receivingBeatIdx,
            throwLength: 0,
            toPasserIdx: receivingManipulatorRowIdx,
            // toHand: 1 - substitutedThrow.fromHand,
            type: ThrowType.Filled,
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
        // fromHand: 0, // TODO: hand unclear!
        // toHand: 0, // TODO: hand unclear!
        throwBeat: t.beat,
        throwLength: t.throwLength,
        type: ThrowType.BaseManipulator,
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



    const interceptCarryPairs: [InterceptAction, CarryAction | undefined][] = []
    // need to match intercepts and carries where there may be multiple pairs in a row and a row may start with a wraparound carry
    for (const manipulatorRole of manipulatorRoles) {
        const actions = manipulations.filter(m => m.manipulatorRole === manipulatorRole && ['I', 'C'].includes(m.kind)).sort((a, b) => a.beat - b.beat)
        if (actions.length === 0) continue
        if (actions[0].kind === 'C') actions.push(actions.shift()!)
        while (actions.length > 0) {
            const intercept = actions.shift()!
            assert(intercept.kind === 'I', `intercept expected, but found ${intercept.kind} for ${manipulatorRole} at ${intercept.beat}`)
            if (actions.length > 0 && actions[0].kind === 'C')
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



//     `e` -- substitute/intercept **e**arly
// `l` -- substitute/intercept **l**ate (default for substitution)
// `v` -- substitute/intercept **v**ery late (default for intercept)
// `c` -- substitute/intercept as a **c**hop
// `d` -- substitution with **d**elayed placement (like German turn; modeled as a 1p in local)

// `o` or `]` -- substitute/intercept from **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side.
// `x` or `[` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to x). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side.
// `b` -- intercept very late from **b**ehind the target's location

// `f` -- zip with **f**lipping the club (`zf`) / flip only the active club on the carry (`CBf`), by default carry implies flipping both clubs


function checkModifiers(actionKind: 'I' | 'S', modifiers: string) {
    assert(actionKind !== 'I' || !modifiers.includes('d'), `cannot use 'd' modifier for ${actionKind} action`)
    const mutuallyExclusive = ['e', 'l', 'v', 'c']
    for (const a of mutuallyExclusive)
        for (const b of mutuallyExclusive)
            if (a !== b && modifiers.includes(a) && modifiers.includes(b))
                throw new Error(`cannot use both ${a} and ${b} modifiers for ${actionKind} action`)
}



