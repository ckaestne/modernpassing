import assert from "node:assert";
import { Pattern, Throw , Beat, Role, Time, ThrowType} from "./pattern-structure.ts";



export class PatternImpl implements Pattern {




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
            const markers = t.markers ? t.markers.filter(m => m !== ThrowType.Base && m !== ThrowType.BaseManipulator):[]
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
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles)
    }
    removeThrow(thatThrow: Throw): Pattern {
        const newThrows = this.throws.filter(t => t !== thatThrow)
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles)
    }

    /** 
     * adds a row for a new passer with the provided role
     * 
     * returns the new pattern with the new row at the end
     */
    addRole(newRole: string): Pattern {
        const newRowIdx = this.nrRows
        return new PatternImpl(this.throws, this.nrHands, [...this.mapRows, newRowIdx], this.roles.map(r => [r[0], [...r[1], newRole]] as [number, Role[]]))
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

        return new PatternImpl(this.throws, this.nrHands, mapRows, roles)
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
    getInitialRoles(): string[] {
        return this.roles[0][1]
    }


}