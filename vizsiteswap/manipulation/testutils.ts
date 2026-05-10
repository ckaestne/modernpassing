import { createGroupPattern } from "@modernpassing/parsing"
import type { ManipulatorAction, Pattern, Throw } from "@modernpassing/pattern"
import { applyManipulations } from "./manipulator-processing.ts"
import assert from "node:assert"

// just adapt old tests to the new interface
export function parseGroupSyncPattern(s: string): [string] {
    return [s]
}
export function createPatternFromRaw(p: string, hands: number): [Pattern, ManipulatorAction[]] {
    const x = createGroupPattern(p, hands, true)
    return [x.aidanNotation![0], x.aidanNotation![1]]
}

export function assertEqualPattern(p1: Pattern, p2: Pattern, msg?: string) {
    assert.equal(p1.nrHands, p2.nrHands, msg)
    assert.equal(p1.getLength(), p2.getLength(), msg)
    assert.equal(p1.nrRows, p2.nrRows, msg)

    // rows may not be in the same order, so let's compare transformations in role changes
    assert.deepEqual(
        p1.mapRows.map((r, i) => p1.getRole(0, i) + "--" + p1.getRole(0, r)).sort(),
        p2.mapRows.map((r, i) => p2.getRole(0, i) + "--" + p2.getRole(0, r)).sort(),
        msg,
    )
    assert.deepEqual(normalizeRoles(p1), normalizeRoles(p2), msg)

    assertEqualThrows(p1, p2, msg)
}
function normalizeRoles(pattern: Pattern): string[] {
    const roles: string[] = []
    for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
        const fromRole = pattern.getRole(0, rowIdx)
        for (let beat = 0; beat < pattern.getLength(); beat++) {
            roles.push(`${fromRole}${beat}${pattern.getRole(beat, rowIdx)}`)
        }
    }
    return roles.sort()
}

function assertEqualThrows(pattern1: Pattern, pattern2: Pattern, msg?: string) {
    function s(a: Throw, b: Throw): number {
        const x = a.throwBeat - b.throwBeat
        if (x !== 0) return x
        return a.fromPasserIdx - b.fromPasserIdx
    }

    const t1 = pattern1.throws.map((t) => {
        return `${t.throwBeat} ${pattern1.getRole(t.throwBeat, t.fromPasserIdx)} ${t.throwLength} ${pattern1.getRole(t.throwBeat, t.toPasserIdxAtCausal)}`
    }).sort()
    const t2 = pattern2.throws.map((t) => {
        return `${t.throwBeat} ${pattern2.getRole(t.throwBeat, t.fromPasserIdx)} ${t.throwLength} ${pattern2.getRole(t.throwBeat, t.toPasserIdxAtCausal)}`
    }).sort()

    assert.deepStrictEqual(t1, t2)
}
