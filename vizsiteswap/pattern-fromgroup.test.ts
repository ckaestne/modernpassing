import assert, { fail } from "node:assert";
import test from "node:test";
import { createSyncGroupPattern, parseGroupSyncPattern, PLayout, PRow, PRows, PShapes, tokenizer, TShape } from "./pattern-fromgroup.ts";
import { expectEOF, expectSingleResult } from "typescript-parsec";
import { GroupPattern, Throw } from "./pattern-structure.ts";


test("parse simple group pattern", async (t) => {

    // let x= tokenizer.parse("A: 3pB333pC33\n B: 3p\npositions: Circle(A,B,C)")
    // while (x) {
    //     console.log(x.text, x.kind)
    //     x = x.next
    // }

    expectSingleResult(expectEOF(PRow.parse(tokenizer.parse("A: 3pB333pC33"))))
    expectSingleResult(expectEOF(PRows.parse(tokenizer.parse("A: 3pB333pC33\n B: 3p"))))
    expectSingleResult(expectEOF(PShapes.parse(tokenizer.parse("Circle(A,B,C)"))))
    expectSingleResult(expectEOF(PLayout.parse(tokenizer.parse("positions: Circle(A,B,C)"))))

    const input = "A: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)"

    const p = parseGroupSyncPattern(input)
    // console.log(p)


    assert(p[0].length === 3)
    assert.deepStrictEqual([p[0][0][0], p[0][1][0], p[0][2][0]], ['A', 'B', 'C'])
    assert.deepStrictEqual(p[0][0][1], ['3pB', '3', '3', '3pC', '3', '3'])
    assert.deepStrictEqual(p[1], [{ type:'standard', shape: TShape.Circle, roles: ['A', 'B', 'C'] }])

    // assert.deepStrictEqual(p[0], ['A', 'B', 'C'])
    // assert.equal(p[1].length, 3)
    //todo check shape

})


test("test pattern creation", async (t) => {
    const gp: GroupPattern = createSyncGroupPattern("A: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)", {})
    const p = gp.pattern
    const roles = ['A', 'B', 'C']
    assert.deepStrictEqual(p.passerNames, roles)
    assert.equal(p.period, 6)
    assert.equal(p.prefixPeriod, 0)
    const throws = p.getThrows(1)
    function assertContainsThrow(throws: Throw[], fromRole: string, throwLength: number, toRole: string, atTime: number) {
        const t = throws.find(t => t.fromPasserIdx === roles.indexOf(fromRole) && (t.rethrowTime - t.throwTime) === throwLength && t.toPasserIdx === roles.indexOf(toRole) && t.throwTime === atTime)
        if (!t) fail(`throw ${fromRole} ${throwLength} -> ${toRole} at ${atTime} not found`)
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

