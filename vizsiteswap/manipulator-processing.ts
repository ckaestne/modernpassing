import { TPatternRow } from "./pattern-fromgroup.ts";
import { Role } from "./pattern-structure.ts";
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

    findThrowsByRole(time: Time, fromRole?: Role, toRoleAtCausal?: Role): Throw[] {
        // due to limits of the notation, this is not straightforward --
        // we are looking for a throw thrown on $time of unknown length that arrives 
        // to a passer who at the time of arrival of the throw has the role $toRole
        // (this may not be the role the passer has at time $time)

        // this is particularly unintutive for an intercept that wraps around and lands 
        // on a beat earlier than thrown, because of the role switching at the end of the 
        // pattern. A self from B might well be thrown to A then.
        // Fortunately we don't put the intercept on the very last beat in practice

        const fromPasserIdx = fromRole ? this.getRowIdxByRole(time, fromRole) : undefined
        const ts = this.findThrows((time + this.getLength()) % this.getLength(), fromPasserIdx, undefined) // cannot identify target due to possible relabeling
        if (toRoleAtCausal)
            return ts.filter(t =>
                t.toPasserIdx === this.getRowIdxByRole(this.getThrowCauseBeat(t), toRoleAtCausal))
        // t.toPasserIdx === this.adjustRowIdxByTime(this.getThrowCauseTime_(time, t.throwLength), this.getRowIdxByRole(time, toRoleAtCausal)))
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

    /** 
     * hopefully clearer version of adjustRowIdxByTime:
     * what row is a specific juggler n beats before/after the current beat
     */
    samePasserNBeatsLater(rowIdx: number, currentTime: Time, timeDelta: number): number {
        while (currentTime < 0) currentTime += this.getLength()
        while (currentTime >= this.getLength()) currentTime -= this.getLength()
        return this.adjustRowIdxByTime(currentTime + timeDelta, rowIdx)
    }



    prettyPrintThrows(): string {

        let result = ""


        const printThrow = (t: Throw): string => {
            // if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${this.getRole(t.throwBeat, t.toPasserIdx)}|${t.note}`
            const fromRole = this.getRole(t.throwBeat, t.fromPasserIdx)
            const toRole = this.getRole(this.getThrowCauseBeat(t), t.toPasserIdx)
            // const printRole = fromRole !== toRole ? toRole : ""
            const markers = t.markers.filter(m => m !== ThrowType.Base && m !== ThrowType.BaseManipulator)
            const printType = markers.length === 0 ? "" : "|" + markers.join("")
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
            result += `-> ${this.mapRows[rowIdx]} [${this.getRole(this.getLength(), rowIdx)}]`
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
        return this.getThrowCauseTime_(t.throwBeat, t.throwLength)
    }

    getThrowCauseTime_(throwTime: number, throwLength: number): number {
        return throwTime + throwLength - this.nrHands
    }

    getThrowCauseBeat(t: Throw): number {
        return this.getThrowCauseBeat_(t.throwBeat, t.throwLength)
    }
    getThrowCauseBeat_(throwTime: number, throwLength: number): number {
        return (throwTime + throwLength - this.nrHands + this.getLength()) % this.getLength()
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
     * @param labelsOnly if true, this does not change the relabeling at the end
     *   should probably be used only for debugging/testing
     */
    swapRoles(beat: Beat, roleA: string, roleB: string, labelsOnly: boolean = false): Pattern {
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

        const mapRows = labelsOnly ? this.mapRows : this.mapRows.map((r, i) => i === rowIdxA ? this.mapRows[rowIdxB] : i === rowIdxB ? this.mapRows[rowIdxA] : r)

        return new Pattern(this.throws, this.nrHands, mapRows, roles)
    }

    private validationError: string | undefined = undefined

    /**
     * checks whether the pattern is valid in that there is a single throw thrown and landing on every beat per juggler
     * 
     * call getValidationError() to get the error message if this returns false
     */
    isValid(): boolean {
        if (this.validationError) return false

        const foundThrown: boolean[/*row*/][/*beat*/] = Array.from({ length: this.nrRows }, () => Array(this.getLength()).fill(false))
        const foundCaught: boolean[/*row*/][/*beat*/] = Array.from({ length: this.nrRows }, () => Array(this.getLength()).fill(false))

        for (const t of this.throws) {
            if (foundThrown[t.fromPasserIdx][t.throwBeat]) {
                this.validationError = `more than one throw on beat ${t.throwBeat} from ${t.fromPasserIdx}`
                return false
            } else
                foundThrown[t.fromPasserIdx][t.throwBeat] = true

            const causeBeat = this.getThrowCauseBeat(t)
            if (foundCaught[t.toPasserIdx][causeBeat]) {
                this.validationError = `more than one catch on beat ${causeBeat} by ${t.toPasserIdx}`
                return false
            } else
                foundCaught[t.toPasserIdx][causeBeat] = true
        }
        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++) {
            for (let beat = 0; beat < this.getLength(); beat++) {
                if (!foundThrown[rowIdx][beat]) {
                    this.validationError = `no throw found on beat ${beat} from ${rowIdx}`
                    return false
                }
                if (!foundCaught[rowIdx][beat]) {
                    this.validationError = `no catch found on beat ${beat} by ${rowIdx}`
                    return false
                }
            }
        }
        return true
    }

    getValidationError(): string {
        this.isValid()
        return this.validationError ?? "valid"
    }

    /**
     * returns the starting objects in each hand for each row, as pair of [right, left] numbers
     */
    getStartingHands(): [number,number][] {
        assert(this.isValid())
        const foundCaught: boolean[/*row*/][/*beat*/] = Array.from({ length: this.nrRows }, () => Array(this.getLength()).fill(false))

        for (const t of this.throws) {
            const rethrowTime = t.throwBeat+t.throwLength
            const causeBeat = this.getThrowCauseBeat(t)
            if (rethrowTime<this.getLength()) 
                    foundCaught[this.samePasserNBeatsLater(t.toPasserIdx,causeBeat, this.nrHands)][rethrowTime] = true
        }
        // console.log(foundCaught)
        const result: [number,number][] = []
        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++) {
            let right = 0
            let left = 0
            for (let beat = 0; beat < this.getLength(); beat++) {
                if (!foundCaught[rowIdx][beat]) {
                    if (beat % 2 === 0) right++
                    else left++
                }
            }
            result.push([right, left])
        }
        return result

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

    markers: ThrowType[],
    note: string
}
export enum ThrowType {
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

            markers: [ThrowType.Base],
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
    pattern = pattern.swapRoles(iBeat, manipulatedRoleOnIBeat, intercept.manipulatorRole)

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
            let markers = t.markers
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
        // fromHand: 0, // TODO: hand unclear!
        // toHand: 0, // TODO: hand unclear!
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
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
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
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
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
                pattern = pattern.addThrow({
                    fromPasserIdx: rowIdx2BeatsLater,
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
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx1BeatsLater,
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
            pattern = pattern.addThrow({
                fromPasserIdx: rowIdx,
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

