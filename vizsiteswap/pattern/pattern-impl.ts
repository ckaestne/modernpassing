import assert from "node:assert";
import { type Pattern, type Throw, type Beat, type Role, type Time, Hand, ThrowMarker, InterceptMarker } from "./pattern.ts";
import { green, bold, gray, red, blue, dim, setColorEnabled } from "https://deno.land/std@0.123.0/fmt/colors.ts"



export class PatternImpl implements Pattern {




    readonly throws: Throw[]
    readonly nrHands: number

    readonly mapRows: number[] // identify the new rowId for each row at the end of the pattern (i.e. classic relabeling)
    readonly roles: [Beat, Role[]][] // role label for each row after a given beat -- labels are purely decorative; multiple labels can be provided for different beats to highlight the effect of midpattern-relabeling after intercepts; always has at least one entry for beat 0 which is always first in the array
    readonly nrRows: number

    private readonly length: number
    private readonly prefixLength: number

    readonly globalHandOrder: Hand[]
    readonly globalHandOrderOffset: number

    constructor(throws: Throw[], nrHands: number, mapRows: number[], roles: Role[] | [Beat, Role[]][], globalHandOrder: Hand[], globalHandOrderOffset: number = 0, patternLength?: number, prefixLength?: number) {
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
        
        assert(globalHandOrder.length > 0, "globalHandOrder must not be empty")
        assert(globalHandOrder.length % nrHands === 0, `globalHandOrder length (${globalHandOrder.length}) must be a multiple of nrHands (${nrHands})`)
        this.globalHandOrder = globalHandOrder
        this.globalHandOrderOffset = globalHandOrderOffset
        this.length = patternLength ?? Math.max(...throws.map(t => t.throwBeat)) + 1
        this.prefixLength = prefixLength ?? 0 - Math.min(...this.throws.map(t => t.throwBeat))
    }




    findThrow(throwBeat: Beat, fromPasserIdx?: number, toPasserIdxAtCausal?: number, fromHand?: Hand, toHand?: Hand): Throw | undefined {
        assert(throwBeat >= -this.getPrefixLength() && throwBeat < this.getLength())
        let ts = this.findThrows(throwBeat, fromPasserIdx, toPasserIdxAtCausal)
        if (fromHand !== undefined) ts = ts.filter(t => this.getThrowHand(t, 0) === fromHand)
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
    getFromPasserRole/*atThrow*/(t: Throw): Role {
        return this.getRole(t.throwBeat, t.fromPasserIdx)
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
                this.getToPasserIdxAtThrow(t) === this.getRowIdxByRole(t.throwBeat, toRoleAtThrow) ||
                t.markers?.some(m => m.kind === 'I' && (m as InterceptMarker).originalToRoleAtThrow === toRoleAtThrow) // we also consider throws that have been redirected to a manipulator by an intercept if they originally pointed to that role
            )
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
            rowIdx = this.mapRows[rowIdx] ?? rowIdx
            time -= this.getLength()
        }
        while (time < 0) {
            const r = this.mapRows.findIndex(r => r === rowIdx)
            if (r !== -1) rowIdx = r
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

    /**
     * helper function to do the same transformation as `samePasserOtherTime`
     * but with roles
     * @param role 
     * @param currentTime 
     * @param newTime 
     * @returns 
     */
    samePasserOtherTimeByRole(role: Role, currentTime: Time, newTime: Time): Role {
        const rowIdxAtCurrentTime = this.getRowIdxByRole(currentTime, role)
        return this.getRole(newTime, rowIdxAtCurrentTime)
    }

    prettyPrintThrows(withColor?: boolean): string {
        setColorEnabled(withColor !== false)

        let result = ""


        const printThrow = (t: Throw): string => {
            // if (['S', 'C', 'I', 'P'].includes(t.note[0])) return `${t.throwLength}${this.getRole(t.throwBeat, t.toPasserIdx)}|${t.note}`
            // const fromRole = this.getRole(t.throwBeat, t.fromPasserIdx)
            const toRole = this.getToPasserRole(t) //this.getRole(this.getThrowCauseBeat(t), this.getToPasserIdxAtThrow(t))
            // const printRole = fromRole !== toRole ? toRole : ""
            const markers = t.markers ? t.markers.filter(m => m.kind !== 'B' && m.kind !== 'M') : []
            const printType = markers.length === 0 ? "" : markers.map(m => m.kind).join("")
            const hand = this.getThrowHand(t, 0)
            const isCrossing = this.isSelfThrow(t) ? "" : bold(this.isStraightPass(t, 0) ? "‖" : "X")
            const targetFirstIteration = this.getToPasserIdxOnCausal(t) + (this.getTargetHandFirstIteration(t) === Hand.Left ? "L" : "R") + this.getThrowCauseBeat(t)
            const str = `${t.throwLength}${toRole}${isCrossing}${gray(targetFirstIteration)}${printType}`
            return hand === Hand.Left ? green(str) : blue(str)
        }

        const showHeader = true
        // header
        if (showHeader) {
            result += "Beat:\t"

            for (let beat = -this.getPrefixLength(); beat < 0; beat++) {
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
            for (let beat = -this.getPrefixLength(); beat < 0; beat++) {
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
            result += `-> ${this.mapRows[rowIdx]} [${this.getRole(this.getLength(), rowIdx)}]`
            result += "\n"
        }
        return result
    }


    /**
     * just returns the length of the pattern 
     * (no longer automatically computed)
     * @returns 
     */
    getLength(): number {
        // if (!this.length) this.length = Math.max(...this.throws.map(t => t.throwBeat)) + 1
        return this.length
    }

    getThrowCauseTime(t: Throw, iteration?: number): number {
        return this.getThrowCauseTime_(t.throwBeat, t.throwLength) + (iteration ?? 0) * this.getLength()
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
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles, this.globalHandOrder, this.length)
    }
    removeThrow(thatThrow: Throw): Pattern {
        const newThrows = this.throws.filter(t => t !== thatThrow)
        return new PatternImpl(newThrows, this.nrHands, this.mapRows, this.roles, this.globalHandOrder, this.length)
    }

    /** 
     * adds a row for a new passer with the provided role
     * 
     * returns the new pattern with the new row at the end
     */
    addRole(newRole: string): Pattern {
        const newRowIdx = this.nrRows

        // With global hand order system, adding a role is straightforward
        // All passers follow the same global hand order sequence

        return new PatternImpl(this.throws, this.nrHands, [...this.mapRows, newRowIdx], this.roles.map(r => [r[0], [...r[1], newRole]] as [number, Role[]]),
            this.globalHandOrder, this.length)
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

        return new PatternImpl(this.throws, this.nrHands, mapRows, roles, this.globalHandOrder, this.length)
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
                        if (this.nrHands === 4 && foundThrown[rowIdx][hand][beat]?.markers?.some(m => m.kind === 'C') || foundThrown[rowIdx][hand][beat]?.throwLength === 4) continue //TODO ignore without incoming carry for now
                        this.validationError = `throw on beat ${beat} from ${rowIdx}/${hand ? "L" : "R"} but no incoming catch`
                        return false
                    }
                    if (foundCaught[rowIdx][hand][beat] && !foundThrown[rowIdx][hand][beat]) {
                        if (this.nrHands === 4 && foundCaught[rowIdx][hand][beat]?.markers?.some(m => m.kind === 'I')) continue //TODO ignore without incoming intercept for now
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
            const fromHand = this.getThrowHand(t, 0)
            if (causeTime < 0) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${fromHand === Hand.Left ? "L" : "R"} lands before the start of the pattern; for now such prefix throws are not supported`
                return false
            }
            // should land on a hand that throws
            const causeBeat = this.getThrowCauseBeat(t)
            const targetHand = this.getTargetHand(t, 0)
            const targetPasserIdx = t.toPasserIdxAtCausal
            if (!foundThrown[targetPasserIdx][targetHand][causeBeat]) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${fromHand === Hand.Left ? "L" : "R"} lands on a hand that does not throw on that beat`
                return false
            }

            // should land on a hand where the catching throw is a wraparound throw
            const competingWraparoundThrow = foundCaught[targetPasserIdx][targetHand][causeBeat]
            if (!competingWraparoundThrow || this.getThrowCauseTime(competingWraparoundThrow) < this.getLength()) {
                this.validationError = `prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${fromHand === Hand.Left ? "L" : "R"} lands on a hand that already catches a pass in the first iteration of the pattern`
                return false
            }

            //should not have multiple throws on the same beat+hand
            if (foundPrefixThrown[t.fromPasserIdx][fromHand][-t.throwBeat]) {
                this.validationError = `more than one prefix throw on beat ${t.throwBeat} from ${t.fromPasserIdx}/${fromHand === Hand.Left ? "L" : "R"}: \n\t${JSON.stringify(foundPrefixThrown[t.fromPasserIdx][fromHand])} and \n\t${JSON.stringify(t)}`
                return false
            }
            foundPrefixThrown[t.fromPasserIdx][fromHand][-t.throwBeat] = t
        }
        // check crossing/straight is actually correct with the handswitches
        for (const t of this.throws) {
            for (let iteration = 0; iteration < this.iterationsUntilRepeat(); iteration++) {
                const time = t.throwBeat + iteration * this.getLength()
                const fromHand = this.getThrowHand(t, iteration)
                const causeTime = this.getThrowCauseTime(t, iteration)
                if (causeTime < this.getLength()) continue // already implicitly checked for the first iteration above
                const causeBeat = this.getThrowCauseBeat(t)
                const toHand = this.getTargetHand(t, iteration)
                const causedThrow = foundThrown[t.toPasserIdxAtCausal][this.getTargetHandFirstIteration(t)][causeBeat]
                if (!causedThrow && this.nrHands === 4 && t.markers?.some(m => m.kind === 'I')) continue //TODO ignore without incoming intercept for now
                assert(causedThrow, `cannot find caused throw on beat ${causeBeat} for throw ${t.toPasserIdxAtCausal}/${this.getTargetHandFirstIteration(t) ? "L" : "R"} at time ${causeTime} (iteration ${iteration}) -- ${JSON.stringify(t)}`)
                const causedThrowHand = this.getThrowHand(causedThrow, Math.floor(causeTime / this.getLength()))
                if (toHand !== causedThrowHand) {
                    this.validationError = `crossing/straight: ${this.isStraightPass(t, iteration) ? "‖" : "X"} throw at time ${time} (beat ${t.throwBeat}) "${t.throwLength}${this.getRole(causeBeat, t.toPasserIdxAtCausal)}${t.flipCrossing ? "X" : ""}" from ${t.fromPasserIdx}/${fromHand ? "L" : "R"} is thrown to ${t.toPasserIdxAtCausal}/${toHand ? "L" : "R"} but the caused throw is thrown from ${t.toPasserIdxAtCausal}/${causedThrowHand ? "L" : "R"} at time ${causeTime}`
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
                const to = this.samePasserNBeatsLater(this.getToPasserIdxOnCausal(t), t.throwBeat, iteration * this.getLength() + t.throwLength - this.nrHands)
                // console.log(`catching ${from}/${hand(t.fromHand)} ${t.throwLength} @ ${t.throwBeat} -> ${to}/${hand(catchHand)} @ ${causeTime} (${iteration})`)
                result[to][catchHand]++
            }
            while (causeTime < 0) {
                const catchHand = this.getTargetHand(t, iteration)
                const to = this.samePasserNBeatsLater(this.getToPasserIdxAtThrow(t), t.throwBeat, iteration * this.getLength())
                // console.log(`catching ${from}/${hand(t.fromHand)} ${t.throwLength} @ ${t.throwBeat} -> ${to}/${hand(catchHand)} @ ${causeTime} (${iteration})`)
                result[to][catchHand]--
                iteration++

                causeTime += this.getLength()
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
        // if (!this.prefixLength) this.prefixLength = 0 - Math.min(...this.throws.map(t => t.throwBeat))
        return this.prefixLength
    }

    getGlobalHand(iteration: number, beat: number): Hand {
        assert(this.globalHandOrder)
        // Calculate the index into the global hand order
        // All passers start at index 0, then advance by the time progression
        // The offset affects how we transition between iterations
        const timeOffset = iteration * this.getLength() + beat + iteration * this.globalHandOrderOffset
        const handIndex = ((timeOffset % this.globalHandOrder.length) + this.globalHandOrder.length) % this.globalHandOrder.length
        
        return this.globalHandOrder[handIndex]
    }

    // Helper method to convert old system to new system (for migration)
    convertToGlobalHandOrder(): { globalHandOrder: Hand[] } {
        // For now, create a simple [Right, Left] alternating pattern
        // This is a basic conversion - more sophisticated logic needed for complex patterns
        const globalHandOrder: Hand[] = [Hand.Right, Hand.Left]
        
        return { globalHandOrder }
    }

    getThrowHand(t: Throw, iteration: number): Hand {
        assert(t)
        
        // Use global hand order system
        const defaultHand = this.getGlobalHand(iteration, t.throwBeat)
        // If fromOppositeHand is true, return the opposite of the global hand
        return t.fromOppositeHand ? (1 - defaultHand) as Hand : defaultHand
    }
    isStraightPass(t: Throw, iteration: number): boolean {
        assert(t)

        return this.getThrowHand(t, iteration) !== this.getTargetHand(t, iteration)

    }
    getTargetHand(t: Throw, iteration: number): Hand {
        assert(t)
        
        // Calculate the landing time and beat
        let causeTime = this.getThrowCauseTime(t, iteration)
        let targetIteration = 0
        while (causeTime >= this.getLength()) {
            causeTime -= this.getLength()
            targetIteration++
        }
        while (causeTime < 0) {
            causeTime += this.getLength()
            targetIteration--
        }


        const defaultTargetHand = this.getGlobalHand(targetIteration, causeTime)

        // Apply transformations based on throw properties:
        // 1. If thrown from opposite hand, flip the target
        let targetHand = t.fromOppositeHand ? (1 - defaultTargetHand) as Hand : defaultTargetHand
        
        // 2. If throw is flipped (crossing behavior), flip again
        if (t.flipCrossing) {
            targetHand = (1 - targetHand) as Hand
        }
        
        return targetHand
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
        // if (this.nrHands === 4) return t.throwLength % 2 === 0
        return t.fromPasserIdx === this.getToPasserIdxAtThrow(t)
    }

    iterationsUntilRepeat(): number {
        // simplest case: rows do not change and pattern is a multiple of the default hand-sequence
        if (this.mapRows.every((v, i) => v === i) && (this.getLength() + this.globalHandOrderOffset) % this.globalHandOrder.length === 0)
            return 1

        const isSameStart = (iteration: number): boolean => {
            // roles must match
            for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++)
                if (this.getRole(0, rowIdx) !== this.getRole(iteration * this.getLength(), rowIdx))
                    return false
            // hands and crossing must match
            for (const t of this.throws) {
                if (this.getThrowHand(t, 0) !== this.getThrowHand(t, iteration))
                    return false
                if (this.isStraightPass(t, 0) !== this.isStraightPass(t, iteration))
                    return false
            }
            return true
        }

        // else, let's just run it through to see when we are back
        let iteration = 0
        while (true) {
            iteration++
            if (iteration > 100)
                throw new Error("the pattern does not repeat within 100 iterations, something is likely wrong")
            if (isSameStart(iteration))
                return iteration
        }
    }

    /** count how often any passer throws two consecutive throws (1 beat apart) from the same hand */
    countHurries(): number {
        let hurryCount = 0;

        // const findNextThrow = (t: Throw, distance: number): [Throw | undefined, number] => {
        //     // searching the immediate next for 2handed patterns, and the next three (usually only distance 2, but allow for weird wraps) for 4handed patterns
        //     if (distance > 1 && this.nrHands===2) return [undefined, 0] 
        //     if (distance > 3) return [undefined, 0]

        //     const nextTime = t.throwBeat + distance
        //     const nextBeat = nextTime % this.getLength();
        //     const nextIteration = Math.floor(nextTime / this.getLength());
        //     const samePasserNextBeat = this.samePasserNBeatsLater(t.fromPasserIdx, t.throwBeat, nextTime-t.throwBeat)
        //     const nextThrow = this.findThrow(nextBeat, samePasserNextBeat)
        //     if (!nextThrow) return findNextThrow(t, distance + 1)
        //     return [nextThrow, nextIteration]
        // }

        // for (const t of this.throws) {
        //     const [nextThrow, nextIteration] = findNextThrow(t, 1)
        //     if (nextThrow && this.getThrowHand(t, 0) === this.getThrowHand(nextThrow, nextIteration))
        //         hurryCount++;

        // }

        for (let time = 0; time < this.getLength() * this.iterationsUntilRepeat(); time++) {
            for (let rowIdx = 0; rowIdx < this.nrRows; rowIdx++) {
                const r = this.samePasserOtherTime(rowIdx, 0, time)
                const t1 = this.findThrows(time % this.getLength(), r, undefined)

                const nextTime = time + this.nrHands / 2
                const r2 = this.samePasserOtherTime(rowIdx, 0, nextTime)
                const t2 = this.findThrows(nextTime % this.getLength(), r2, undefined)

                if (t1.length === 0 && t2.length === 0) {/*if no throws on either beat, ignore it*/ }
                else if (t1.length === 0 || t2.length === 0) {
                    // One beat has no throws, skip hurry count
                }
                else if (t1.length === 1 && t2.length === 1) {
                    if (this.getThrowHand(t1[0], Math.floor(time / this.getLength())) === this.getThrowHand(t2[0], Math.floor(nextTime / this.getLength())))
                        hurryCount++
                } else console.warn(`unclear how to handle ${JSON.stringify(t1)} and ${JSON.stringify(t2)} at time ${time} for row ${rowIdx} (${this.getRole(time, rowIdx)})`)
            }
        }

        return hurryCount;
    }
}


export class ThrowImpl implements Throw {
    constructor(
        throwBeat: number,
        fromPasserIdx: number,
        fromOppositeHand: boolean,
        toOppositeHand: boolean,
        toPasserIdxAtCausal: number,
        throwLength: number,
        markers?: ThrowMarker[],
        note?: string
    ) {

        assert(Number.isInteger(throwBeat), "throwBeat must be a whole number, but got " + throwBeat);
        this.throwBeat = throwBeat
        assert(Number.isInteger(fromPasserIdx) && fromPasserIdx >= 0, "fromPasserIdx must be a whole number >=0, but got " + fromPasserIdx);
        this.fromPasserIdx = fromPasserIdx
        this.fromOppositeHand = fromOppositeHand
        assert(Number.isInteger(toPasserIdxAtCausal) && toPasserIdxAtCausal >= 0, "toPasserIdxAtThrow must be a whole number >=0, but got " + toPasserIdxAtCausal);
        this.toPasserIdxAtCausal = toPasserIdxAtCausal
        assert(Number.isInteger(throwLength) && throwLength >= 0, "throwLength must be a whole number >=0, but got " + throwLength);
        this.throwLength = throwLength
        this.markers = markers
        this.note = note
        this.flipCrossing = toOppositeHand
    }

    throwBeat: number;
    fromPasserIdx: number;
    fromOppositeHand: boolean;
    flipCrossing: boolean;
    throwLength: number;
    toPasserIdxAtCausal: number;
    markers?: ThrowMarker[];
    note?: string | undefined;


}