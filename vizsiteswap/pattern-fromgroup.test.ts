import assert, { fail } from "node:assert";
import test from "node:test";
import { expectEOF, expectSingleResult } from "npm:typescript-parsec";
import { createSyncGroupPattern, parseGroupSyncPattern, PManipulatorAction, PRow, tokenizer } from "./pattern-fromgroup.ts";
import { GroupPattern, Throw } from "./pattern-structure.ts";


test("parse simple group pattern", async (t) => {

    // let x= tokenizer.parse("A: 3pB333pC33\n B: 3p\npositions: Circle(A,B,C)")
    // while (x) {
    //     console.log(x.text, x.kind)
    //     x = x.next
    // }

    expectSingleResult(expectEOF(PRow.parse(tokenizer.parse("A: 3pB333pC33"))))
    // expectSingleResult(expectEOF(PRows.parse(tokenizer.parse("A: 3pB333pC33\n B: 3p"))))
    // expectSingleResult(expectEOF(PShapes.parse(tokenizer.parse("Circle(A,B,C)"))))
    // expectSingleResult(expectEOF(PLayout.parse(tokenizer.parse("positions: Circle(A,B,C)"))))

    const input = "A: 3pB333pC33\n           B: 3pC333pA33\n            C: 3pA333pB33\n            positions: Circle(A,B,C)"

    const p = parseGroupSyncPattern(input)
    // console.log(p)


    assert(p[0].length === 3)
    assert.deepStrictEqual([p[0][0].role, p[0][1].role, p[0][2].role], ['A', 'B', 'C'])
    assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3', '3', '3pC', '3', '3'])
    assert.deepStrictEqual(p[1], { type: 'standard', shape: 'Circle', roles: ['A', 'B', 'C'] })

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

test('walking v', async (t) => {
    const pattern = `A: 3pB3  3pC3  3pB3  -> B
B: 3pA3  3  3  3pA3 -> C
C: 3 3 3pA3  3  3  -> A
positions: V(A,B,C)
move: Vmove(B,3.9,3)`
    const gp: GroupPattern = createSyncGroupPattern(pattern, {})
    // console.log(gp.layout?.animation)
})


test('basic manipulator pattern parsing', async (t) => {
    const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -> B
B: 3pA3 33   3pA3 33   3pA3 33 -> A
M: SBcz SAlz SAcz SAlz IAv]. CA`
    const p = parseGroupSyncPattern(chopabout)

    assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3', '3', '3', '3pB', '3', '3', '3', '3pB', '3', '3', '3'])
    assert.equal(p[0][0].role, 'A')
    assert.equal(p[0][0].isManipulator, false)
    assert.equal(p[0][0].relabel, "B")
    assert.deepStrictEqual(p[0][1].sequence, ['3pA', '3', '3', '3', '3pA', '3', '3', '3', '3pA', '3', '3', '3'])
    assert.equal(p[0][1].role, 'B')
    assert.equal(p[0][1].isManipulator, false)
    assert.equal(p[0][1].relabel, "A")
    assert.deepStrictEqual(p[0][2].sequence, ["SBc", "z", "SAl", "z", "SAc", "z", "SAl", "z", "IAv]", ".", "CA","."])
    assert.equal(p[0][2].role, 'M')
    assert.equal(p[0][2].isManipulator, true)
    assert.equal(p[0][2].relabel, undefined)

})

test('manipulator pattern parsing of opernball', async (t) => {
    const opernball = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -> B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -> A
M: SBloz   zf  SBloz   .   IBvbCA  . 
N: SAloz   .   IAvbCB  .   SBloz   zf  
O: IBvbCA  .   SAloz   zf  SAloz   .   `
    const p = parseGroupSyncPattern(opernball)
    // console.log(p)

    assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3pB', '3', '3pB', '3pB', '3', '3pB', '3pB', '3'])
    assert.equal(p[0][0].role, 'A')
    assert.equal(p[0][0].isManipulator, false)
    assert.equal(p[0][0].relabel, "B")
    assert.deepStrictEqual(p[0][2].sequence, ["SBlo", "z", "zf", "SBlo", "z", ".", "IBvb", "CA", "."])
    assert.equal(p[0][2].role, 'M')
    assert.equal(p[0][2].isManipulator, true)
    assert.equal(p[0][2].relabel, undefined)
    assert.deepStrictEqual(p[0][3].sequence, ["SAlo", "z", ".", "IAvb", "CB", ".", "SBlo", "z", "zf"])
    assert.equal(p[0][3].role, 'N')
    assert.equal(p[0][3].isManipulator, true)
    assert.equal(p[0][3].relabel, undefined)

})


test('manipulator with multiple actions on the same beat and delayed placement', async (t) => {
    const pp = `A: 3pB 3pB 3  -> B
B: 3pA 3pA 3   -> A
M: . (SBd2, 2) 
`
    const p = parseGroupSyncPattern(pp)

    assert.deepStrictEqual(p[0][2].sequence, ['.', ['SBd2', '2'], '.'])
    assert.equal(p[0][2].role, 'M')
    assert.equal(p[0][2].isManipulator, true)

})