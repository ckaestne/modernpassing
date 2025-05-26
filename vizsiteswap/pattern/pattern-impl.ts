import assert from "node:assert";
import { Pattern, Throw, Beat, Role, Time, ThrowType, Hand } from "./pattern.ts";
import { green, bold, gray, red, blue, dim, setColorEnabled } from "https://deno.land/std@0.123.0/fmt/colors.ts"
import { deprecate } from "node:util";



export class PatternImpl implements Pattern {




    readonly throws: Throw[]
    readonly nrHands: number

    readonly mapRows: number[] // identify the new rowId for each row at the end of the pattern (i.e. classic relabeling)
    readonly roles: [Beat, Role[]][] // role label for each row after a given beat -- labels are purely decorative; multiple labels can be provided for different beats to highlight the effect of midpattern-relabeling after intercepts; always has at least one entry for beat 0 which is always first in the array
    readonly nrRows: number

    // hands
    readonly mapHands: boolean[][]
    readonly mapCrossing: boolean[][]
    readonly initialHands: Hand[]

    constructor(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][], mapHands?: boolean[][], mapCrossing?: boolean[][], initialHands?: Hand[], patternLength?: number) {
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
        this.mapHands = mapHands ?? Array(mapRows.length).fill([false])
        this.mapCrossing = mapCrossing ?? Array(mapRows.length).fill([false])
        this.initialHands = initialHands ?? Array(mapRows.length).fill(Hand.Right)
        this.length = patternLength
    }


    private length: number | undefined
    private prefixLength: number | undefined = undefined


    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdxAtCausal?: number, fromHand?: Hand, toHand?: Hand): Throw | undefined {
        assert(throwBeat >= -this.getPrefixLength() && throwBeat < this.getLength())
        let ts = this.findThrows(throwBeat, fromPasserIdx, toPasserIdxAtCausal)
        if (fromHand !== undefined) ts = ts.filter(t => t.fromHand === fromHand)
        if (toHand !== undefined) ts = ts.filter(t => this.getTargetHand(t, 0) === toHand)
        if (ts.length === 0) return undefined

        if (ts.length > 1) {
            ts = ts.sort((a, b) => b.throwLength - a.throwLength)
            if (ts.filter(t => t.throwLength > 2).length > 1)
                console.warn(`found multiple throws for time ${throwBeat} from ${fromPasserIdx}/${fromHand} to ${toPasserIdxAtCausal}/${toHand}, returning the one with the highest throw\n${JSON.stringify(ts)}`)
        }
        return ts[0]
    }

    findThrows(throwBeat: Beat, fromPasserIdx?: number, toPasserIdxAtCausal?: number): Throw[] {
        assert(throwBeat >= -this.getPrefixLength() && throwBeat < this.getLength())
        let ts = this.throws.filter(t => t.throwBeat === throwBeat)
        if (fromPasserIdx !== undefined) ts = ts.filter(t => t.fromPasserIdx === fromPasserIdx)
        if (toPasserIdxAtCausal !== undefined) ts = ts.filter(t => this.getToPasserIdxOnCausal(t) === toPasserIdxAtCausal)
        return ts
    }

    getToPasserIdxOnCausal(t: Throw): number {
        return t.toPasserIdxAtCausal
    }
    getToPasserIdxAtThrow(t: Throw): number {
        return this.samePasserOtherTime(t.toPasserIdxAtCausal, this.getThrowCauseTime(t), t.throwBeat)
    }
    getToPasserRole/*atThrow*/(t: Throw): Role {
        return this.getRole(t.throwBeat, this.getToPasserIdxAtThrow(t))
    }

    /** @deprecated Use findThrowsByRoleAtThrow instead */
    findThrowsByRoleAtCausal(time: Time, fromRole?: Role, toRoleAtCausal?: Role): Throw[] {
        // Deprecated: should not be needed anymore (was used when interpreting roles on substitution instructions as atCausal rather than atThrow)

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
                this.getToPasserIdxOnCausal(t) === this.getRowIdxByRole(this.getThrowCauseBeat(t), toRoleAtCausal))
        // t.toPasserIdx === this.adjustRowIdxByTime(this.getThrowCauseTime_(time, t.throwLength), this.getRowIdxByRole(time, toRoleAtCausal)))
        else return ts
    }

    findThrowsByRoleAtThrow(time: Time, fromRole?: Role, toRoleAtThrow?: Role): Throw[] {
        const fromPasserIdx = fromRole ? this.getRowIdxByRole(time, fromRole) : undefined
        const ts = this.findThrows((time + this.getLength()) % this.getLength(), fromPasserIdx, undefined) // cannot identify target due to possible relabeling
        if (toRoleAtThrow)
            return ts.filter(t =>
                this.getToPasserIdxAtThrow(t) === this.getRowIdxByRole(t.throwBeat, toRoleAtThrow))
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

    samePasserOtherTime(rowIdx: number, currentTime: Time, newTime: number): number {
        return this.samePasserNBeatsLater(rowIdx, currentTime, newTime - currentTime)
    }


    prettyPrintThrows(withColor:boolean = true): string {
        setColorEnabled(withColor)

        let result = ""


        const printThrow = (t: Throw): string => {
            // if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${this.getRole(t.throwBeat, t.toPasserIdx)}|${t.note}`
            // const fromRole = this.getRole(t.throwBeat, t.fromPasserIdx)
            const toRole = this.getToPasserRole(t) //this.getRole(this.getThrowCauseBeat(t), this.getToPasserIdxAtThrow(t))
            // const printRole = fromRole !== toRole ? toRole : ""
            const markers = t.markers ? t.markers.filter(m => m !== ThrowType.Base && m !== ThrowType.BaseManipulator) : []
            const printType = markers.length === 0 ? "" : markers.join("")
            const hand = this.getThrowHand(t, 0)
            const isCrossing = this.isSelfThrow(t) ? "" : bold(this.isCrossingPass(t, 0) ? "‖" : "X")
            const targetFirstIteration = this.getToPasserIdxOnCausal(t) + (this.getTargetHandFirstIteration(t) === Hand.Left ? "L" : "R") + this.getThrowCauseBeat(t)
            const str = `${t.throwLength}${toRole}${isCrossing}${gray(targetFirstIteration)}${printType}`
            return hand === Hand.Left ? green(str) : blue(str)
        }

        const showHeader = true
        // header
        if (showHeader) {
            result += "Beat:\t"

            for (let beat = -this.getPrefixLength(); beat<0; beat++) {
                result += beat + "\t"
            }
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
            for (let beat = -this.getPrefixLength(); beat<0; beat++) {
                const t = myThrows.filter(t => t.throwBeat === beat)
                result += t.map(printThrow).join(",")
                result += "\t"
            }
            for (let beat = 0; beat < this.getLength(); beat++) {
                const newRoles = this.roles.find(r => r[0] === beat)
                if (beat !== 0 && newRoles)
                    result += `(${newRoles[1][rowIdx]})\t`

                const t = myThrows.filter(t => t.throwBeat === beat)
                result += t.map(printThrow).join(",")
                result += "\t"
            }
            result += `-> ${this.mapRows[rowIdx]} [${this.getRole(this.getLength(), rowIdx)}]${this.mapHands[rowIdx][0]?"⇆":""}${this.mapCrossing[rowIdx][0]?"X":""}`
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
        let beat = (throwTime + throwLength - this.nrHands) % this.getLength()
        while (beat < 0) beat += this.getLength()
        return beat
    }
    getThrowCauseLength(t: Throw): number {
        return t.throwLength - this.nrHands
    }
    getThrowCauseLength_(throwLength: number): number {
        return throwLength - this.nrHands
    }


    addThrow(newThrow: Throw): Pattern {
        const newThrows = [...this.throws, newThrow]
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles, this.mapHands, this.mapCrossing, this.initialHands)
    }
    removeThrow(thatThrow: Throw): Pattern {
        const newThrows = this.throws.filter(t => t !== thatThrow)
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles, this.mapHands, this.mapCrossing, this.initialHands)
    }

    /** 
     * adds a row for a new passer with the provided role
     * 
     * returns the new pattern with the new row at the end
     */
    addRole(newRole: string): Pattern {
        const newRowIdx = this.nrRows

        // mostly this is straightforward, but mapping of hands and crossing is tricky. 
        // for now let's guess that the manipulator is James and swaps hands on odd-length patterns

        // this should probably not matter to much. it's on the intercept -- when swapping roles
        // that mapping needs to be changed. it may not matter too much what a manipulator does
        // on its own

        return new PatternImpl(this.throws, this.nrHands, [...this.mapRows, newRowIdx], this.roles.map(r => [r[0], [...r[1], newRole]] as [number, Role[]]),
            this.mapHands.concat([[this.getLength()%2===1]]),
            this.mapCrossing.concat([[false]]), 
            undefined, this.length)
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

        // we won't touch mapCrossing and mapHands. that's for the implementation of the intercept to adjust

        // assert(this.mapCrossing.every((v) => v.every(x=>!x)), `TODO: mapCrossing not implemented for swapRoles (${this.mapCrossing})`)
        // assert.deepEqual(this.mapHands[rowIdxA], this.mapHands[rowIdxB], "TODO: mapHands not implemented for mapHands with different values")

        return new PatternImpl(this.throws, this.nrHands, mapRows, roles, this.mapHands, this.mapCrossing, this.initialHands)
    }

    private validationError: string | undefined = undefined

    /**
     * checks whether the pattern is valid in that there is a single throw thrown and landing on every beat per juggler
     * 
     * call getValidationError() to get the error message if this returns false
     */
    isValid(): boolean {
        if (this.validationError) return false

        const foundThrown: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: this.nrRows }, () => Array.from({ length: 2 }, () => Array(this.getLength()).fill(undefined)))
        const foundCaught: (Throw | undefined)[/*row*/][/*hand*/][/*beat*/] = Array.from({ length: this.nrRows }, () => Array.from({ length: 2 }, () => Array(this.getLength()).fill(undefined)))

        // ignore prefix throws for indexing
        for (const t of this.throws) if (t.throwBeat >= 0) {
            const hand = this.getThrowHand(t, 0)
            if (foundThrown[t.fromPasserIdx][hand][t.throwBeat]) {
                this.validationError = `more than one throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${hand ? "L" : "R"}: \n\t${JSON.stringify(foundThrown[t.fromPasserIdx][t.throwBeat])} and \n\t${JSON.stringify(t)}`
                return false
            } else
                foundThrown[t.fromPasserIdx][hand][t.throwBeat] = t

            const causeBeat = this.getThrowCauseBeat(t)
            // if we cross the pattern boundary, consider a pass from a previous period to be the incoming one to get the hands right in the wraparound
            const targetHandInFirstIteration = this.getTargetHandFirstIteration(t)
            // const from = this.samePasserNBeatsLater(t.fromPasserIdx, t.throwBeat, iteration*this.getLength())
            // const to = this.samePasserNBeatsLater(t.toPasserIdx, t.throwBeat, Math.max(iteration,0)*this.getLength()+t.throwLength-this.nrHands)
            const from = t.fromPasserIdx
            const to = this.getToPasserIdxOnCausal(t)
            // console.log(`${from}/${hand?"L":"R"} @ ${t.throwBeat} -> ${to}/${targetHand?"L":"R"} @ ${causeBeat} (${this.getThrowCauseTime(t)}, ${iteration})`)
            if (foundCaught[to][targetHandInFirstIteration][causeBeat]) {
                this.validationError = `more than one catch on beat ${causeBeat} by ${to}/${targetHandInFirstIteration ? "L" : "R"}: \n\t${JSON.stringify(foundCaught[to][causeBeat])} and \n\t${JSON.stringify(t)}`
                return false
            } else
                foundCaught[to][targetHandInFirstIteration][causeBeat] = t
        }
        for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++) {
            for (let beat = 0; beat < this.getLength(); beat++) {
                for (const hand of [Hand.Right, Hand.Left]) {
                    if (foundThrown[rowIdx][hand][beat] && !foundCaught[rowIdx][hand][beat]) {
                        if (this.nrHands===4 && foundThrown[rowIdx][hand][beat]?.markers?.includes(ThrowType.Carry) || foundThrown[rowIdx][hand][beat]?.throwLength===4) continue //TODO ignore without incoming carry for now
                        this.validationError = `throw on beat ${beat} from ${rowIdx}/${hand ? "L" : "R"} but no incoming catch`
                        return false
                    }
                    if (foundCaught[rowIdx][hand][beat] && !foundThrown[rowIdx][hand][beat]) {
                        if (this.nrHands===4 && foundCaught[rowIdx][hand][beat]?.markers?.includes(ThrowType.Intercept)) continue //TODO ignore without incoming intercept for now
                        const c = foundCaught[rowIdx][hand][beat]
                        this.validationError = `catch on beat ${beat} by ${rowIdx}/${hand ? "L" : "R"} (from beat ${c?.throwBeat}) but no outgoing throw`
                        return false
                    }
                }
            }
        }
        // check prefix throws
        const foundPrefixThrown: (Throw | undefined)[/*row*/][/*hand*/][/*-beat*/] = Array.from({ length: this.nrRows }, () => Array.from({ length: 2 }, () => Array(this.getPrefixLength()).fill(undefined)))
        for (const t of this.throws) if (t.throwBeat < 0) {
            // for simplicity let's not allow prefix throws to land before the pattern
            const causeTime = this.getThrowCauseTime(t)
            if (causeTime<0) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands before the start of the pattern; for now such prefix throws are not supported`
                return false
            }
            // should land on a hand that throws
            const causeBeat = this.getThrowCauseBeat(t)
            const targetHand = this.getTargetHand(t, 0)
            const targetPasserIdx = t.toPasserIdxAtCausal
            if (!foundThrown[targetPasserIdx][targetHand][causeBeat]) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands on a hand that does not throw on that beat`
                return false
            }
                
            // should land on a hand where the catching throw is a wraparound throw
            const competingWraparoundThrow = foundCaught[targetPasserIdx][targetHand][causeBeat] 
            if (!competingWraparoundThrow || this.getThrowCauseTime(competingWraparoundThrow)< this.getLength()) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand} lands on a hand that already catches a pass in the first iteration of the pattern`
                return false
            }

            //should not have multiple throws on the same beat+hand
            if (foundPrefixThrown[t.fromPasserIdx][t.fromHand][-t.throwBeat]) {
                this.validationError = `more than one prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${t.fromHand}: \n\t${JSON.stringify(foundPrefixThrown[t.fromPasserIdx][t.fromHand])} and \n\t${JSON.stringify(t)}`
                return false
            }
            foundPrefixThrown[t.fromPasserIdx][t.fromHand][-t.throwBeat]= t
        }
        // check crossing/straight is actually correct with the handswitches
        for (const t of this.throws) {
            const fromHand = this.getThrowHand(t, 0)
            const causeTime = this.getThrowCauseTime(t)
            if (causeTime< this.getLength()) continue
            const causeBeat = this.getThrowCauseBeat(t)
            const toHand = this.getTargetHand(t,0)
            const causedThrow = foundThrown[t.toPasserIdxAtCausal][this.getTargetHandFirstIteration(t)][causeBeat]
            assert(causedThrow, "caused throw not found")
            const causedThrowHand = this.getThrowHand(causedThrow, Math.floor(causeTime/this.getLength()))
            if (toHand!==causedThrowHand){
                this.validationError= `crossing/straight throw ${t.throwLength}${this.getRole(causeBeat, t.toPasserIdxAtCausal)}${t.isCrossing ? "X" : ""} from ${t.fromPasserIdx}/${fromHand} to ${t.toPasserIdxAtCausal}/${toHand} is not consistent with the crossing/straight pass`
                return false
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
    getStartingHands(ignorePrefix: boolean = false): [number, number][] {
        // we assume the pattern is valid, so there is an incoming throw for each outgoing one
        assert(this.isValid())

        const result: [number, number][] = Array.from({ length: this.nrRows }, () => [1, 1])

        // find throws that are caught in the first iteration
        for (const t of this.throws) if (t.throwBeat >= 0) {
            let causeTime = this.getThrowCauseTime(t)
            let iteration = 0
            // if a throw crosses the pattern boundary, it means we'll start with an extra club in the hand that catches it
            // if we wrap around repeatedly, we start with an extra club for every wraparound
            while (causeTime >= this.getLength()) {
                causeTime -= this.getLength()
                iteration--

                const catchHand = this.getTargetHand(t, iteration)
                const from = this.samePasserNBeatsLater(t.fromPasserIdx, t.throwBeat, iteration * this.getLength())
                const to = this.samePasserNBeatsLater(this.getToPasserIdxOnCausal(t), t.throwBeat, iteration * this.getLength() + t.throwLength - this.nrHands)
                // console.log(`catching ${from}/${hand(t.fromHand)} ${t.throwLength} @ ${t.throwBeat} -> ${to}/${hand(catchHand)} @ ${causeTime} (${iteration})`)
                result[to][catchHand]++
            }
            while (causeTime < 0) {
                const catchHand = this.getTargetHand(t, iteration)
                const from = this.adjustRowIdxByTime(iteration * this.getLength(), t.fromPasserIdx)
                const to = this.samePasserNBeatsLater(this.getToPasserIdxOnCausal(t), t.throwBeat, iteration * this.getLength() + t.throwLength - this.nrHands)
                // console.log(`catching ${from}/${hand(t.fromHand)} ${t.throwLength} @ ${t.throwBeat} -> ${to}/${hand(catchHand)} @ ${causeTime} (${iteration})`)
                result[from][catchHand]--

                causeTime += this.getLength()
                iteration++
            }
        }

        // prefix throws in a valid pattern land on a throw without a catch in the first iteration, so adjustments should be fairly easy
        if (!ignorePrefix)
        for (const t of this.throws) if (t.throwBeat < 0) {
            const fromHand = this.getThrowHand(t, 0)
            const toHand = this.getTargetHand(t, 0)
            const fromPasserIdx = t.fromPasserIdx
            const targetPasserIdx = t.toPasserIdxAtCausal
            result[fromPasserIdx][fromHand]++
            result[targetPasserIdx][toHand]--
        }
        // TODO: if the cause is before the beginning of the pattern, we have to deal with empty hands


        return result

    }
    getInitialRoles(): string[] {
        return this.roles[0][1]
    }

    getPrefixLength(): number {
        if (!this.prefixLength) this.prefixLength = 0-Math.min(...this.throws.map(t => t.throwBeat)) 
        return this.prefixLength
    }
    isSwappedHands(rowIdx: number, iteration: number): boolean {
        if (iteration > 0) {
            const previousRowIdx = this.mapRows.findIndex(r => r === rowIdx)
            const previousSwap = this.mapHands[previousRowIdx]!
            const didSwap = previousSwap[(iteration - 1) % previousSwap.length]!
            return didSwap !== this.isSwappedHands(previousRowIdx, iteration - 1)
        }
        if (iteration < 0) {
            const nextRowIdx = this.mapRows[rowIdx]
            const swap = this.mapHands[rowIdx]!
            const willSwap = swap[-iteration % swap.length]!
            return willSwap !== this.isSwappedHands(nextRowIdx, iteration + 1)
        }
        assert(iteration === 0)
        return false
    }
    isSwappedCrossing(rowIdx: number, iteration: number): boolean {
        if (iteration > 0) {
            const previousRowIdx = this.mapRows.findIndex(r => r === rowIdx)
            const previousSwap = this.mapCrossing[previousRowIdx]!
            const didSwap = previousSwap[(iteration - 1) % previousSwap.length]!
            return didSwap !== this.isSwappedCrossing(previousRowIdx, iteration - 1)
        }
        if (iteration < 0) {
            const nextRowIdx = this.mapRows[rowIdx]
            const swap = this.mapCrossing[rowIdx]!
            const willSwap = swap[-iteration % swap.length]!
            return willSwap !== this.isSwappedCrossing(nextRowIdx, iteration + 1)
        }
        assert(iteration === 0)
        return false
    }
    getThrowHand(t: Throw, iteration: number): Hand {
        assert(t)
        const hand = t.fromHand
        const isSwap = this.isSwappedHands(t.fromPasserIdx, iteration)

        return isSwap ? 1 - hand : hand
    }
    isCrossingPass(t: Throw, iteration: number): boolean {
        assert(t)
        const isCrossing = t.isCrossing
        return this.isSwappedCrossing(t.fromPasserIdx, iteration) !== isCrossing
    }
    getTargetHand(t: Throw, iteration: number): Hand {
        assert(t)
        const hand = this.getThrowHand(t, iteration)
        if (this.isSelfThrow(t))
            return t.isCrossing ? 1 - hand : hand
        else
            return this.isCrossingPass(t, iteration) ? 1 - hand : hand
    }
    getTargetHandFirstIteration(t: Throw): Hand {
        let causeTime = this.getThrowCauseTime(t)
        let iteration = 0
        while (causeTime >= this.getLength()) {
            causeTime -= this.getLength()
            iteration--
        }
        while (causeTime < 0) {
            causeTime += this.getLength()
            iteration++
        }
        return this.getTargetHand(t, iteration)
    }

    isSelfThrow(t: Throw): boolean {
        return t.fromPasserIdx === this.getToPasserIdxAtThrow(t)
    }

    iterationsUntilRepeat(): number {
        // simplest case: nothing changes
        if (this.mapRows.every((v, i) => v === i) && this.mapHands.every(r => r.every(h => !h)) && this.mapCrossing.every(r => r.every(c => !c))) 
            return 1
        
        const isSameStart = (iteration: number): boolean => {
            // roles must match
            for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++)
              if (this.getRole(0, 0) !== this.getRole(iteration * this.getLength(), 0))
                return false
            // hands and crossing must match
            for (const t of this.throws) {
              if (this.getThrowHand(t, 0) !== this.getThrowHand(t, iteration))
                return false
              if (this.isCrossingPass(t, 0) !== this.isCrossingPass(t, iteration))
                return false
            }
            return true
          }

        // else, let's just run it through to see when we are back
        let iteration = 0
        while (true) {
            iteration++
            if (iteration>100) 
                throw new Error("the pattern does not repeat within 100 iterations, something is likely wrong")
            if (isSameStart(iteration)) 
                return iteration
        }

     
    }
}


function hand(h: Hand): string {
    return h === Hand.Left ? "L" : "R"
}


export class ThrowImpl implements Throw {
    constructor(
        throwBeat: number,
        fromPasserIdx: number,
        fromHand: Hand,
        isCrossing: boolean,
        toPasserIdxAtCausal: number,
        throwLength: number,
        markers?: ThrowType[],
        note?: string
    ) {
        
        assert(Number.isInteger(throwBeat), "throwBeat must be a whole number, but got " + throwBeat);
        this.throwBeat = throwBeat
        assert(Number.isInteger(fromPasserIdx) && fromPasserIdx>=0, "fromPasserIdx must be a whole number >=0, but got " + fromPasserIdx);
        this.fromPasserIdx = fromPasserIdx
        assert(fromHand === Hand.Left || fromHand === Hand.Right, "fromHand must be either Hand.Left or Hand.Right, but got " + fromHand);
        this.fromHand = fromHand
        assert(Number.isInteger(toPasserIdxAtCausal) && toPasserIdxAtCausal>=0, "toPasserIdxAtThrow must be a whole number >=0, but got " + toPasserIdxAtCausal);
        this.toPasserIdxAtCausal = toPasserIdxAtCausal
        assert(Number.isInteger(throwLength) && throwLength>=0, "throwLength must be a whole number >=0, but got " + throwLength);
        this.throwLength = throwLength
        this.markers = markers
        this.note = note
        this.isCrossing = isCrossing
    }

    throwBeat: number;
    fromPasserIdx: number;
    fromHand: Hand;
    isCrossing: boolean;
    throwLength: number;
    toPasserIdxAtCausal: number;
    markers?: ThrowType[] | undefined;
    note?: string | undefined;

}