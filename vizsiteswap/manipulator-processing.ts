import { assert } from "node:console";
import { TPatternRow } from "./pattern-fromgroup.ts";
import { GroupPattern, Role } from "./pattern-structure.ts";
import { TThrow } from "./pattern-fromsync.ts";
import { Hand } from "./pattern-structure.ts";



type Throw = {
    fromPasserIdx: number
    fromPasserRole: Role
    fromHand: Hand

    throwTime: number
    causeTime: number // does not wrap around (i.e. may be higher than pattern length, may be negative)
    throwLength: number

    toPasserIdx: number
    toPasserRole: Role // this is the role at throw time, not accounting for possible relabeling
    toHand: Hand

    note: string
}

type ManipulatorAction = {
    throw: Throw, // identifies the throw that is manipulated
    manipulatorIdx: number, //idx of the manipulator
    manipulatorRole: Role,
    kind: 'I' | 'C' | 'S' | 'T' // intercept, carry, substitution, throw
}


/**
 * turns raw input rows into a pattern that can be manipulated
 * supports sync patterns and 4hsiteswaps
 * 
 * @param pattern pattern parsed from input
 * @param nrHands nr of hands (usually 2 for sync and 3ps or 4 for 4hsiteswaps and 7s)
 * @returns 
 */
export function patternToThrows(pattern: TPatternRow[], nrHands: number): [Role[], Throw[], ManipulatorAction[]] {
    const roles = pattern.map(row => row.role)
    const patternLength = getRawPatternLength(pattern, nrHands)
    const baseRoles = pattern.filter(r => !r.isManipulator).map(row => row.role)
    const nrBaseRoles = pattern.filter(r => !r.isManipulator).length

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
            fromPasserRole: roles[who],
            fromHand: when % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,//assuming hand order rA, rB, rC... lA, lB, lC...

            throwTime: when,
            causeTime: when + throwLength - nrHands,
            throwLength: Number.parseInt(throwStr),

            toPasserIdx: to,
            toPasserRole: roles[to],
            toHand: (when + throwLength) % nrHands < nrHands / 2 ? Hand.Right : Hand.Left,

            note: throwStr
        }
    }

    function iterate(c: (currentRowIdx: number, currentRow: TPatternRow, currentThrow: TThrow, beat: number) => void): void {
        assert(nrHands === 2 || nrHands === 4, `only supporting 2 and 4 hands for now`)

        for (let currentRowIdx = 0; currentRowIdx < pattern.length; currentRowIdx++) {
            const currentRow = pattern[currentRowIdx]
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

    function convertManipulatorAction(baseThrows: Throw[], throwStr: string, whoIdx: number, when: number): ManipulatorAction {
        if (throwStr[0] === 'z') throwStr = (nrHands / 2).toString()
        const who = roles[whoIdx]
        
        if (['I', 'C', 'S'].includes(throwStr[0])) {
            const firstRole = throwStr[1]
            assert(roles.includes(firstRole), `target role ${firstRole} in ${throwStr} not found in ${roles}`)
            let secondRole: string|undefined = undefined
            if (throwStr[2] && throwStr[2].match(/[A-Z]/)) {
                secondRole = throwStr[2]
                assert(roles.includes(secondRole), `target role ${secondRole} in ${throwStr} not found in ${roles}`)
            }
            const fromRoleIdx = secondRole ? roles.indexOf(firstRole) : undefined // only defined when both are specified, otherwise single role is assumed to be the target
            const toRoleIdx = secondRole ? roles.indexOf(secondRole) : roles.indexOf(firstRole) // 
            const manipulatedThrow = findThrow(baseThrows, when, fromRoleIdx, toRoleIdx) // this is the throw that is manipulated
            assert(manipulatedThrow, `no throw found for ${throwStr} at ${when}`)

            return {
                kind: throwStr[0] as 'I' | 'C' | 'S',
                throw: manipulatedThrow as Throw,
                manipulatorIdx: whoIdx,
                manipulatorRole: who,
            }
        } else
        return {
            kind: 'T',
            throw: convert(throwStr, whoIdx, when),
            manipulatorIdx: whoIdx,
            manipulatorRole: who,
        }
    }

    function getManipulatorActions(baseThrows: Throw[]): ManipulatorAction[] {
        const result: ManipulatorAction[] = []
        iterate((currentRowIdx, currentRow, currentThrow, beat) => {
            if (currentRow.isManipulator) {
                if (Array.isArray(currentThrow)) 
                    result.push(...currentThrow.map(t => convertManipulatorAction(baseThrows, t, currentRowIdx, beat)))
                else result.push(convertManipulatorAction(baseThrows, currentThrow, currentRowIdx, beat))
            }
        })
        return result
    }




    const baseThrows = getBaseThrows()
    return [roles, baseThrows, getManipulatorActions(baseThrows)]
}

function findThrow(throws: Throw[], throwTime: number, fromPasserIdx: number | undefined, toPasserIdx: number | undefined): Throw | undefined {
    let ts = throws.filter(t => t.throwTime === throwTime)
    if (fromPasserIdx !== undefined) ts = ts.filter(t => t.fromPasserIdx === fromPasserIdx)
    if (toPasserIdx !== undefined) ts = ts.filter(t => t.toPasserIdx === toPasserIdx)
    if (ts.length === 0) return undefined
    if (ts.length > 1) throw new Error(`found multiple throws for time ${throwTime} from ${fromPasserIdx} to ${toPasserIdx}: ${JSON.stringify(ts)}`)
    return ts[0]
}


export function prettyPrintThrows(throws: Throw[]): string {
    const patternLength = Math.max(...throws.map(t => t.throwTime)) + 1
    const roles = Array.from(new Set(throws.map(t => t.fromPasserRole))).sort()
    let result = ""

    function printThrow(t: Throw): string {
        return `${t.throwLength}${t.toPasserRole}`
    }

    for (const role of roles) {
        const myThrows = throws.filter(t => t.fromPasserRole === role).sort((a, b) => a.throwTime - b.throwTime)
        result = result + role + ":\t"
        for (let beat = 0; beat < patternLength; beat++) {
            const t = myThrows.find(t => t.throwTime === beat)
            if (t) result += printThrow(t)
            result += "\t"
        }
        result += "\n"
    }
    return result
}

export function prettyPrintManipulatorActions(mactions: ManipulatorAction[]): string {
    const patternLength = Math.max(...mactions.map(t => t.throw.throwTime)) + 1
    const roles = Array.from(new Set(mactions.map(t => t.manipulatorRole))).sort()
    let result = ""

    function printMAction(a: ManipulatorAction): string {
        if (a.kind === 'T') return `${a.throw.throwLength}${a.throw.toPasserRole}`
        return `${a.kind}${a.throw.fromPasserRole}${a.throw.toPasserRole}`
    }

    for (const role of roles) {
        const myThrows = mactions.filter(t => t.manipulatorRole === role).sort((a, b) => a.throw.throwTime - b.throw.throwTime)
        result = result + role + ":\t"
        for (let beat = 0; beat < patternLength; beat++) {
            const ts = myThrows.filter(t => t.throw.throwTime === beat)
            result += ts.map(printMAction).join(",")
            result += "\t"
        }
        result += "\n"
    }
    return result
}



function applyInterceptCarry(throws: Throw[], intercept: ManipulatorAction, carry?: ManipulatorAction): void {
    assert(intercept.kind === 'I', `only intercepts can be applied`)
    assert(!carry || carry.kind === 'C', `only carries can be applied`)
    assert(intercept.throw.throwTime < intercept.throw.causeTime, `intercept time must be before cause time`)
    assert((carry ===undefined) === (intercept.throw.causeTime - intercept.throw.throwTime <= 0), `carry is required if and only if the intercepted throw is not a flip or zip`)
    


}


// /**
//  * takes a pattern with manipulators and turns it into a pattern without manipulator 
//  * actions, were all throws are base throws and takeouts are 2p or 1p throws
//  * 
//  * analyzes the flipping of clubs too; ignores movement for now
//  */
// export function convertManipulatorPatternToLocal(pattern: TPatternRow[]) {

//     const manipulatorRowIdxs = []
//     const baseRowIdxs = []
//     for (let i = 0; i < pattern.length; i++) {
//         if (pattern[i].isManipulator) {
//             manipulatorRowIdxs.push(i)
//         } else {
//             baseRowIdxs.push(i)
//         }
//     }
//     const patternLength = pattern[baseRowIdxs[0]].sequence.length

//     const result: TPatternRow[] = pattern.map(row => ({
//         ...row,
//         sequence: [...row.sequence]
//     }))
//     //fill in missing relabeling; they simply stay the same in the original notation
//     for (const row of result)
//         if (!row.relabel) row.relabel = row.role


//     for (let beat = 0; beat < patternLength; beat++) {
//         for (let currentRowIdx = 0; currentRowIdx < pattern.length; currentRowIdx++) {
//             const currentRow = result[currentRowIdx]
//             const currentAction = currentRow.sequence[beat] as string ?? '.'
//             const currentRole = currentRow.role

//             //we only care about manipulator actions (this may not be in the original manipulator role after shifting on intercepts)
//             if (currentAction === '.') result[currentRowIdx].sequence[beat] = '0/2'
//             if (currentAction.startsWith('z')) {
//                 result[currentRowIdx].sequence[beat] = '1'
//             }
//             if (currentAction.startsWith('s')) {
//                 const targetRole = currentAction[1]
//                 const originRowIdx = getOriginRow(pattern, beat, targetRole)
//                 const throwLength = pattern[originRowIdx].sequence[beat][0]

//                 result[currentRowIdx].sequence[beat] = throwLength + 'p' + targetRole
//                 result[originRowIdx].sequence[beat] = '1p' + currentRole
//             }
//             if (currentAction.startsWith('c')) {
//                 const targetRole = currentAction[1]
//                 const originRowIdx = getOriginRow(pattern, beat, targetRole)
//                 const throwLength = pattern[originRowIdx].sequence[beat][0]

//                 result[currentRowIdx].sequence[beat] = throwLength + 'p' + targetRole
//                 result[originRowIdx].sequence[beat] = '0'
//             }
//             if (currentAction.startsWith('i')) {
//                 const targetRole = currentAction[1]
//                 const originRowIdx = getOriginRow(pattern, beat, targetRole)
//                 const throwLength = pattern[originRowIdx].sequence[beat][0]

//                 result[currentRowIdx].sequence[beat] = '0'
//                 result[originRowIdx].sequence[beat] = throwLength + 'p' + currentRole
//                 swapRolesAfterIntercept(result, beat + Number.parseInt(throwLength) - 2, patternLength, originRowIdx, currentRowIdx)
//             }
//         }

//     }


//     for (const row of result) {
//         console.log(row.role + ":", row.sequence.join("\t"), "\t->", row.relabel)
//     }
//     for (const manipulatorRowIdx of manipulatorRowIdxs) {
//         console.log("__", pattern[manipulatorRowIdx].sequence.join("\t"))
//     }

// }

type Relabeler = (beat: number) => ((role: string) => string)

function assertUniqueIntercepts(mActions: ManipulatorAction[]) {
    const uniqueCheck = new Set<string>();
    for (const m of mActions) 
        if (m.kind==='I') {
        const key = `${m.throw.throwTime}-${m.throw.toPasserIdx}`;
        assert(!uniqueCheck.has(key))
        uniqueCheck.add(key);
    }
}

/**
 * usually not used, just shortcut for testing
 */
export function relabelRaw(pattern: TPatternRow[], nrHands: number): Relabeler {
    const mainRelabel: [string, string][] = pattern.map(r => [r.role, r.relabel ?? r.role])
    
    const [,p,manipulatorActions] = patternToThrows(pattern, nrHands)
    const patternLength = getPatternLength(p)

    return relabel(mainRelabel, patternLength, manipulatorActions)
}

/**
 * computes for every beat of the pattern who is who now
 * 
 * it returns a function from role to role, where the input is a juggler's role at the beginning of the pattern (beat=0)
 * and the output is that juggler's role at the given beat
 * 
 * 
 * for a pattern with `n` beats, the relabel at beat `n` is the typical end of pattern relabel ("turntable")
 * 
 * this function supports the relabeling at 
 * 
 * 
 * @param mainRelabel the relabels indicated in the original pattern notation (`->B` at the end)
 * @param manipulatorActions the manipulator actions that are applied to the pattern, if any
 * @returns 
 */
function relabel(mainRelabel: [string, string][], patternLength: number, manipulatorActions: ManipulatorAction[]): Relabeler {
    assertUniqueIntercepts(manipulatorActions)

    const intercepts = manipulatorActions.filter(m => m.kind === 'I').sort((a, b) => a.throw.throwTime - b.throw.throwTime)

    const manipulatorRelabels: [number, string, string][] = intercepts.flatMap(getManipulatorRelabel).sort((a, b) => a[0] - b[0])
    function getManipulatorRelabel(intercept: ManipulatorAction): [number, string, string][] {
        
        let currentRole = intercept.manipulatorRole
        let targetRole = intercept.throw.toPasserRole
        let iBeat = intercept.throw.causeTime

        // if we cross the pattern boundary, we need to relabel once more, but backward!
        if (iBeat >= patternLength) {
            iBeat -= patternLength
            // currentRole = mainRelabel.find(r => r[1] === currentRole)![0]
            targetRole = mainRelabel.find(r => r[1] === targetRole)![0]
        }
        assert(iBeat < patternLength *2, `intercept throw is longer than the pattern and lands after the pattern wraps twice; not currently supported`)
        return [[iBeat, currentRole, targetRole],[iBeat, targetRole, currentRole]]

    }

    return (beat: number) => {

        return (role: string) => {
            let b = beat
            let result = role
            while (b >= 0) {
                //mid-pattern relabel from intercepts
                const relabels = manipulatorRelabels.filter(r => r[0] <= b)
                const r = relabels.find(r => r[1] === result)
                if (r) result = r[2]

                //end-pattern relabel
                if (b >= patternLength) {
                    result = mainRelabel.find(r => r[0] === result)![1]
                }
                b -= patternLength
            }
            return result
        }
    }
}

/**
 * get the length of the pattern from the raw notation
 * 
 * needs adjustments for 4hsw
 * 
 * @param pattern 
 * @returns 
 */
function getRawPatternLength(pattern: TPatternRow[], nrHands: number): number {
    const l = pattern.filter(r => !r.isManipulator)[0].sequence.length
    if (nrHands === 4) return l * 2 - 1
    if (nrHands === 2) return l
    throw new Error("pattern length not implemented for " + nrHands + " hands")
}

/**
 * prefer to work on the internal representation, so we don't have to worry about
 * 2 vs 4 handedness
 * @param throws 
 * @returns 
 */
function getPatternLength(throws: Throw[]): number {
    return  Math.max(...throws.map(t => t.throwTime)) + 1
}




// /** 
//  * if anybody passed to the targetRole at the given beat, return the row of that passer
//  * otherwise the passer in that role threw a self on that beat, so return their row
// */
// function getOriginRow(pattern: TPatternRow[], beat: number, targetRole: Role): number {
//     for (let rowIdx = 0; rowIdx < pattern.length; rowIdx++)
//         if (!pattern[rowIdx].isManipulator) {
//             const row = pattern[rowIdx]
//             const t = row.sequence[beat]
//             //pass to targetRole?
//             if (t.includes('p' + targetRole)) return rowIdx
//             //non-pass from targetRole?
//             if (!t.includes('p') && row.role === targetRole) return rowIdx
//         }
//     throw new Error('no origin row found for targetRole ' + targetRole + ' at beat ' + beat)
// }

// /** 
//  * in-place role swapping in the pattern
//  * 
//  * everything that arrives on or after the intercept beat (fromBeat) is redirected to the new role
//  * the old role stops all actions that are not triggered by incoming throws (they all turn into holds)
// */
// function swapRolesAfterIntercept(pattern: TPatternRow[], fromBeat: number, patternLength: number, fromRowIdx: number, toRowIdx: number) {
//     const rl = relabel(pattern)
//     const x = pattern[fromRowIdx].relabel
//     pattern[fromRowIdx].relabel = pattern[toRowIdx].relabel
//     pattern[toRowIdx].relabel = x

//     for (let beat = fromBeat; beat < patternLength; beat++) {
//         const x = pattern[fromRowIdx].sequence[beat]
//         pattern[fromRowIdx].sequence[beat] = pattern[toRowIdx].sequence[beat]
//         pattern[toRowIdx].sequence[beat] = x
//     }

// }


// /**
//  * shifting works for patterns with and without manipulators, but shouldn't be applied
//  * to patterns where manipulators are partially localized
//  */
// export function shiftPattern(pattern: TPatternRow[], shift: number, patternLength: number): TPatternRow[] {
//     if (shift > patternLength)
//         return shiftPattern(shiftPattern(pattern, patternLength, patternLength), shift - patternLength, patternLength)
//     if (shift === 0) return pattern
//     if (shift < 0) throw new Error("negative shift not implemented; shift x time forward instead")

//     //assert: 0 < shift <= patternLength


//     const result = pattern.map(row => ({
//         ...row,
//         sequence: [...row.sequence]
//     }))
//     const relabels: [string, string][] = pattern.map(row => [row.role, row.relabel ?? row.role])
//     for (let currentRowIdx = 0; currentRowIdx < pattern.length; currentRowIdx++) {
//         const currentRow = pattern[currentRowIdx]
//         const currentRole = currentRow.role
//         const nextRole = currentRow.relabel ?? currentRole
//         const nextRow = pattern.find(r => r.role === nextRole)!

//         result[currentRowIdx].sequence = currentRow.sequence.slice(shift).concat(relabelTargets(nextRow.sequence.slice(0, shift) as string[], relabels))
//     }

//     return result
// }

// function relabelTargets(seq: string[], relabels: [string, string][]): string[] {
//     function relabel(oldTarget: string): string {
//         const relabelRow = relabels.find(r => r[0] === oldTarget)
//         if (!relabelRow) throw new Error(`target role ${oldTarget} not found in relabels ${JSON.stringify(relabels)}`)
//         return relabelRow[1]
//     }
//     // console.log(JSON.stringify(relabels), seq)
//     const result = seq.map(t => {
//         assert(typeof t === 'string')
//         if (t.startsWith('i') || t.startsWith('c') || t.startsWith('s'))
//             return t[0] + relabel(t[1]) + t.slice(2)
//         if (t.match(/^[0-9]p[A-Z]/))
//             return t.slice(0, 2) + relabel(t[2]) + t.slice(3)
//         return t
//     })
//     return result
// }