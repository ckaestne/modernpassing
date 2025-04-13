import assert from "node:assert";
import { expectSingleResult, expectEOF, Lexer, Token } from "typescript-parsec";
import { parseGroupPattern, PManipulatorSequence, PRow, PThrow, tokenizer } from "./pattern-fromgroup-parser.ts";
import test from "node:test";

Deno.test("parse simple group pattern", async (t) => {

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

    const p = parseGroupPattern(input)
    // console.log(p)


    assert(p[0].length === 3)
    assert.deepStrictEqual([p[0][0].role, p[0][1].role, p[0][2].role], ['A', 'B', 'C'])
    assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3', '3', '3pC', '3', '3'])
    assert.deepStrictEqual(p[1], { type: 'standard', shape: 'Circle', roles: ['A', 'B', 'C'] })

    // assert.deepStrictEqual(p[0], ['A', 'B', 'C'])
    // assert.equal(p[1].length, 3)
    //todo check shape

})



test('basic manipulator pattern parsing', async (t) => {
    const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -- B
B: 3pA3 33   3pA3 33   3pA3 33 -- A
M: SBcz SAlz SAcz SAlz IAv]. CA`
    const p = parseGroupPattern(chopabout)

    assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3', '3', '3', '3pB', '3', '3', '3', '3pB', '3', '3', '3'])
    assert.equal(p[0][0].role, 'A')
    assert.equal(p[0][0].isManipulator, false)
    assert.equal(p[0][0].relabel, "B")
    assert.deepStrictEqual(p[0][1].sequence, ['3pA', '3', '3', '3', '3pA', '3', '3', '3', '3pA', '3', '3', '3'])
    assert.equal(p[0][1].role, 'B')
    assert.equal(p[0][1].isManipulator, false)
    assert.equal(p[0][1].relabel, "A")
    assert.deepStrictEqual(p[0][2].sequence, ["SBc", "z", "SAl", "z", "SAc", "z", "SAl", "z", "IAv]", ".", "CA"])
    assert.equal(p[0][2].role, 'M')
    assert.equal(p[0][2].isManipulator, true)
    assert.equal(p[0][2].relabel, undefined)

})

test('manipulator pattern parsing of opernball', async (t) => {
    const opernball = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -- A
M: SBloz   zf  SBloz   .   IBvbCA  . 
N: SAloz   .   IAvbCB  .   SBloz   zf  
O: IBvbCA  .   SAloz   zf  SAloz   .   `
    const p = parseGroupPattern(opernball)
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
    const pp = `A: 3pB 3pB 3  -- B
B: 3pA 3pA 3   -- A
M: . (SBd2 2) 
`

    logTokens(tokenizer.parse(pp))
    const a = expectSingleResult(expectEOF(PManipulatorSequence.parse(tokenizer.parse(". (SBd2 2) "))))
    // console.log(expectEOF(PRow.parse(tokenizer.parse("A: . (SBd2 2) "))))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(". (SBd2 2) "))))
    console.log(a, b)
    assert(b.isManipulator)

    const p = parseGroupPattern(pp)

    assert.deepStrictEqual(p[0][2].sequence, ['.', ['SBd2', '2']])
    assert.equal(p[0][2].role, 'M')
    assert.equal(p[0][2].isManipulator, true)

})

test('parse manipulator row', () => {
    const t = `M: IA.CzSAz`
    logTokens(tokenizer.parse(t))

    const a = expectSingleResult(expectEOF(PManipulatorSequence.parse(tokenizer.parse(t.slice(3)))))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(t))))
    assert(b.isManipulator)
    console.log(a, b)
})

test('parse manipulator row - handle carry', () => {
    const t = `M: IA.CfzSAz`
    logTokens(tokenizer.parse(t))

    const a = expectSingleResult(expectEOF(PManipulatorSequence.parse(tokenizer.parse(t.slice(3)))))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(t))))
    assert(b.isManipulator)
    console.log(a, b)
})

test('parse allsync pattern', () => {
    const t = `(4px4x)`
    logTokens(tokenizer.parse(t))
    const a = expectSingleResult(expectEOF(PThrow.parse(tokenizer.parse(t))))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(t))))
    assert(!b.isManipulator)
    console.log(b)
})
let max = 500

test('parse prefix in row', () => {
    const t = `4px | 3 4px`
    // logTokens(tokenizer.parse(t))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(t))))
    assert(!b.isManipulator)
    console.log(b)

})
test('parse prefix in row 2', () => {
    const t = `. 4px 3`
    // logTokens(tokenizer.parse(t))
    const b = expectSingleResult(expectEOF(PRow.parse(tokenizer.parse(t))))
    assert(!b.isManipulator)
    console.log(b)

})


function logTokens(x: Token<any> | undefined) {
    while (x && max > 0) {
        console.log(x.text, x.kind)
        x = x.next
        max--
    }
}