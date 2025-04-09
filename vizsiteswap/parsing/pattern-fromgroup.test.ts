import assert, { fail } from "node:assert";
import test from "node:test";
import { expectEOF, expectSingleResult } from "npm:typescript-parsec";
import { GroupPattern, Throw } from "../pattern/pattern.ts";
import { createSyncGroupPattern } from "./pattern-fromgroup.ts";
import { parseGroupPattern } from "./pattern-fromgroup-parser.ts";



test("test pattern creation", async (t) => {
    const gp: GroupPattern = createSyncGroupPattern("A: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)", {})
    const p = gp.pattern
    const roles = ['A', 'B', 'C']
    assert.deepStrictEqual(p.getInitialRoles(), roles)
    assert.equal(p.getLength(), 6)
    // assert.equal(p.prefixPeriod, 0)
    const throws = p.throws
    function assertContainsThrow(throws: Throw[], fromRole: string, throwLength: number, toRole: string, beat: number) {
        const t = throws.find(t => t.fromPasserIdx === roles.indexOf(fromRole) && t.throwLength === throwLength && t.toPasserIdxAtThrow === roles.indexOf(toRole) && t.throwBeat === beat)
        if (!t) fail(`throw ${fromRole} ${throwLength} -> ${toRole} at ${beat} not found`)
    }

    assertContainsThrow(throws, 'A', 3, 'B', 0)
    assertContainsThrow(throws, 'B', 3, 'C', 0)
    assertContainsThrow(throws, 'C', 3, 'A', 0)
    assertContainsThrow(throws, 'A', 3, 'A', 1)
    assertContainsThrow(throws, 'B', 3, 'B', 1)
    assertContainsThrow(throws, 'C', 3, 'C', 1)
    assertContainsThrow(throws, 'A', 3, 'C', 3)
    // console.log(gp.layout)
    // console.log(throws)
})


test("test double feed", async (t) => {
    const pattern = `A: 3pB33
B: 3pA3pC3
C: 3pD3pB3
D: 3pC33
positions: Box(A,C,D,B)`
    const gp: GroupPattern = createSyncGroupPattern(pattern, {})
    const p = gp.pattern
    const roles = ['A', 'B', 'C']
    // console.log(gp.layout)
})

test('walking v', async (t) => {
    const pattern = `A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3 -- C
C: 3 3 3pA3  3  3  -- A
positions: V(A,B,C)
move: Vmove(B,3.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern, {})
    // console.log(gp.layout?.animation)
})

