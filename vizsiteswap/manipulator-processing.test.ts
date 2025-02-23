import test from "node:test";
import { applyInterceptCarry, patternToThrows, prettyPrintManipulatorActions, prettyPrintThrows, relabelRaw, Throw } from "./manipulator-processing.ts";
import { parseGroupSyncPattern } from "./pattern-fromgroup.ts";
import assert, { fail } from "node:assert";
import { only } from "node:test";
import { Role } from "./pattern-structure.ts";


test('test parsing four-count', async () => {
    const p = parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )
    const [r, t] = patternToThrows(p[0], 2)

    console.log(prettyPrintThrows(t))
    assert.deepEqual(prettyPrintThrows(t), 'A:\t3B\t3A\t3A\t3A\t\n' +
        'B:\t3A\t3B\t3B\t3B\t\n')
})

test('test parsing four-count in different notations', async () => {
    // with p and target
    const [, t1] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )[0], 2)
    // implied target
    const [, t2] = patternToThrows(parseGroupSyncPattern(
        `A: 3p 3 3 3 -> B
        B: 3p 3 3 3 -> A`
    )[0], 2)
    // target without p
    const [, t3] = patternToThrows(parseGroupSyncPattern(
        `A: 3B 3 3 3 -> B
        B: 3A 3 3 3 -> A`
    )[0], 2)
    // extra self-targets
    const [, t4] = patternToThrows(parseGroupSyncPattern(
        `A: 3B 3A 3A 3A -> B
        B: 3A 3B 3B 3B -> A`
    )[0], 2)

    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t2))
    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t3))
    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t4))
})


test('test parsing 867', async () => {
    const p = parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )
    const [r, t] = patternToThrows(p[0], 4)

    console.log(prettyPrintThrows(t))

    const expected =
        `A:      7B              6A              8A              7B              6A
     B:              8B              7A              6B              8B`
    assert.deepEqual(prettyPrintThrows(t).replace(/\s+/g, ''), expected.replace(/\s+/g, ''))

    // assert.deepEqual(printThrowsAsPattern(t), 'A:\t3B\t3A\t3A\t3A\n'+
    //             'B:\t3A\t3B\t3B\t3B\n')
})

test('test parsing 867 notation variations', async () => {
    // default notation without annotations
    const [, t1] = patternToThrows(parseGroupSyncPattern(
        `A:  7 6 8 7 6 -> B
         B: , 8 7 6 8 -> A`
    )[0], 4)
    // implied target with p
    const [, t2] = patternToThrows(parseGroupSyncPattern(
        `A:  7p 6 8 7p 6 -> B
         B: , 8 7p 6 8 -> A`
    )[0], 4)
    // target without p
    const [, t3] = patternToThrows(parseGroupSyncPattern(
        `A:  7B 6 8 7B 6 -> B
         B: , 8 7A 6 8 -> A`
    )[0], 4)
    // extra self-targets
    const [, t4] = patternToThrows(parseGroupSyncPattern(
        `A:  7B 6A 8A 7B 6A -> B
         B: , 8B 7A 6B 8B -> A`
    )[0], 4)

    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t2))
    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t3))
    assert.deepEqual(prettyPrintThrows(t1), prettyPrintThrows(t4))
})

test('test parsing chopabout', async () => {
    const p = parseGroupSyncPattern(
        `A: 3pB3 33   3pB3 33   3pB3 33 -> B
         B: 3pA3 33   3pA3 33   3pA3 33 -> A
         M: SBcz SAlz SAcz SAlz IAv]. CA`
    )
    const [r, t, a] = patternToThrows(p[0], 2)

    const s = prettyPrintThrows(t) + prettyPrintManipulatorActions(a)
    console.log(s)

    const expected =
        `A:      3B      3A      3A      3A      3B      3A      3A      3A      3B      3A      3A      3A
     B:      3A      3B      3B      3B      3A      3B      3B      3B      3A      3B      3B      3B
     M:      SAB     1M      SAA     1M      SBA     1M      SAA     1M      IBA             CAA`
    assert.deepEqual(s.replace(/\s+/g, ''), expected.replace(/\s+/g, ''))
})


test('test parsing manege', async () => {
    const p = parseGroupSyncPattern(
        `A: 7pB   6    8  7pB  6-> B
         B: ,   8   7pA  6    8 -> A
         M: IB    , CAf `
    )
    const [r, t, a] = patternToThrows(p[0], 4)

    const s = prettyPrintThrows(t) + prettyPrintManipulatorActions(a)
    console.log(s)

    const expected =
        `A:      7B              6A              8A              7B              6A
     B:              8B              7A              6B              8B
     M:      IAB                     CBA`
    assert.deepEqual(s.replace(/\s+/g, ''), expected.replace(/\s+/g, ''))
    assert(s.includes(':\tIAB\t\t\tCBA'), 'timing of manipulator actions is wrong')
})


test('relabeling: basic', async () => {
    const r = relabelRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A`
    )[0], 2)

    assert.equal(r(0)('A'), 'A')
    assert.equal(r(0)('B'), 'B')
    assert.equal(r(1)('A'), 'A')
    assert.equal(r(1)('B'), 'B')
    assert.equal(r(4)('A'), 'B')
    assert.equal(r(4)('B'), 'A')
    assert.equal(r(5)('A'), 'B')
    assert.equal(r(5)('B'), 'A')
    assert.equal(r(8)('A'), 'A')
    assert.equal(r(8)('B'), 'B')
})

test('relabeling: basic with intercept', async () => {
    const r = relabelRaw(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IA CA`
    )[0], 2)

    assert.equal(r(0)('A'), 'A')
    assert.equal(r(0)('B'), 'B')
    assert.equal(r(0)('M'), 'M')
    assert.equal(r(1)('A'), 'M')
    assert.equal(r(1)('B'), 'B')
    assert.equal(r(1)('M'), 'A')

    assert.equal(r(4)('A'), 'M')
    assert.equal(r(4)('B'), 'A')
    assert.equal(r(4)('M'), 'B')

    assert.equal(r(5)('A'), 'A')
    assert.equal(r(5)('B'), 'M')
    assert.equal(r(5)('M'), 'B')

    assert.equal(r(8)('A'), 'B')
    assert.equal(r(8)('B'), 'M')
    assert.equal(r(8)('M'), 'A')

    assert.equal(r(12)('A'), 'A')
    assert.equal(r(12)('B'), 'B')
    assert.equal(r(12)('M'), 'M')

})


test('relabeling: intercept across pattern boundary', async () => {
    {
        const r = relabelRaw(parseGroupSyncPattern(
            `A: 2 3pB 3 4 -> B
        B: 2 3pA 3 4 -> A
        M: . CB . IA`
        )[0], 2)

        assert.equal(r(0)('A'), 'A')
        assert.equal(r(0)('B'), 'B')
        assert.equal(r(0)('M'), 'M')
        //M switches with B, because that's where the 4 from A lands
        assert.equal(r(1)('A'), 'A')
        assert.equal(r(1)('B'), 'M')
        assert.equal(r(1)('M'), 'B')
        //just relabeling at the end
        assert.equal(r(4)('A'), 'B')
        assert.equal(r(4)('B'), 'M')
        assert.equal(r(4)('M'), 'A')
        //now again B switches with M
        assert.equal(r(5)('A'), 'M')
        assert.equal(r(5)('B'), 'B')
        assert.equal(r(5)('M'), 'A')

        assert.equal(r(12)('A'), 'A')
        assert.equal(r(12)('B'), 'B')
        assert.equal(r(12)('M'), 'M')

    }
    {
        // same thing but the intercept is landing on beat 0
        const r = relabelRaw(parseGroupSyncPattern(
            `A: 3pB 3 4 2 -> B
        B: 3pA 3 4 2 -> A
        M:  CB . IA`
        )[0], 2)

        //this is messed up, but applying intercept relabeling immediately
        assert.equal(r(0)('A'), 'A')
        assert.equal(r(0)('B'), 'M')
        assert.equal(r(0)('M'), 'B')
        assert.equal(r(1)('A'), 'A')
        assert.equal(r(1)('B'), 'M')
        assert.equal(r(1)('M'), 'B')
        //same combo relabel again
        assert.equal(r(4)('A'), 'M')
        assert.equal(r(4)('B'), 'B')
        assert.equal(r(4)('M'), 'A')
        assert.equal(r(5)('A'), 'M')
        assert.equal(r(5)('B'), 'B')
        assert.equal(r(5)('M'), 'A')

        assert.equal(r(12)('A'), 'A')
        assert.equal(r(12)('B'), 'M')
        assert.equal(r(12)('M'), 'B')

    }
})



test('intercept rewrite: basic', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA CA`
    )[0], 2)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 2, 3, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 2, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')
    
    // 1 beat carry is easy, unchanged in this case except for redirecting it
    assertThrow(rewritten, 1, 3, A, M, 'carry')

})



test('intercept rewrite: 456about should be easy', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 5 4 6 5 4 -> B
         B: ,6 5 4 6 -> A
        M: .IA`
    )[0], 4)

    assert(manipulations[0].kind==='I' && manipulations.length===1) // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 4, manipulations[0])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 5, A, B, 'unmodified')
    assertThrow(rewritten, 2, 4, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 2, A, A, 'remove intercepted' )
    assertThrow(rewritten, 2, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 4, 6, M, M, 'moving original throws from A to M')
    assertThrow(rewritten, 6, 5, M, B, 'moving original throws from A to M')
    assertThrow(rewritten, 8, 4, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 4, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 6, A, A, 'moving original throws from A to M')
    assertNoThrow(rewritten, 8, A, A, 'moving original throws from A to M')

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 3, 5, B, M, 'redirected pass')
    
    
})



test('intercept rewrite: manege', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 7 6 8 7 6 -> B
         B: ,8 7 6 8 -> A
        M: IB, CA`
    )[0], 4)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 4, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 7, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, B, 'remove intercepted' )
    assertThrow(rewritten, 3, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 5, 6, M, M, 'moving original throws from B to M')
    assertThrow(rewritten, 7, 8, M, M, 'moving original throws from B to M')
    assertNoThrow(rewritten, 5, B, B, 'moving original throws from B to M')
    assertNoThrow(rewritten, 7, B, B, 'moving original throws from B to M')

    //redirect the pass from B to A now to M
    assertThrow(rewritten, 1, 8, B, M, 'redirected heff')

    // carry is normal
    assertThrow(rewritten, 3, 7, B, A, 'carry')
    
    
})



test('intercept rewrite: basic two beat carry', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . CA`
    )[0], 2)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')
    
    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 3, A, M, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')

})

test('intercept rewrite: basic three beat carry', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: IBA . . CA`
    )[0], 2)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 3, 3, A, M, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')
    assertThrow(rewritten, 3, 2, M, M, 'carry-induced flip at old manipulator')

})


test('intercept rewrite: two carry on a pass', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . CA`
    )[0], 2)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')
    
    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 3, A, B, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')

})


test('intercept rewrite: three-beat carry over a pass', async () => {
    //this creates counterintutive behavior where both M and B have a flip because they are missing a pass that gets carried later
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3 3 3pB 3 -> B
         B: 3 3 3pA 3 -> A
         M: IA . . C`
    )[0], 2)

    assert(manipulations[0].kind==='I' && manipulations[1].kind === 'C') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[0], manipulations[1])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, A, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, A, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')
    
    // now also B has a flip, because a pass to them does not happen
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 3, 3, A, B, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')
    assertThrow(rewritten, 3, 2, B, B, 'carry-induced flip at old manipulator')

})




test.only('intercept rewrite: carry over pattern boundary', async () => {
    const [relabel, throws, manipulations] = patternToThrows(parseGroupSyncPattern(
        `A: 3pB 3 3 3 -> B
        B: 3pA 3 3 3 -> A
        M: C..IB`
    )[0], 2)

    assert(manipulations[0].kind==='C' && manipulations[1].kind === 'I') // just making sure parsing is stable

    const rewritten = applyInterceptCarry(throws, 2, manipulations[1], manipulations[0])
    const A = 0, B = 1, M = 2

    console.log(prettyPrintThrows(rewritten))

    assertThrow(rewritten, 0, 3, B, M, 'new throw for intercept')
    assertNoThrow(rewritten, 0, B, A, 'remove intercepted' )
    assertThrow(rewritten, 1, 0, M,M, 'catching intercept with an empty hand')

    assertThrow(rewritten, 3, 3, M, M, 'moving original throws from A to M')
    assertNoThrow(rewritten, 3, A, A, 'moving original throws from A to M')
    
    // carry is delayed to beat 2, flip on beat 1 and flip for M on beat 2
    assertThrow(rewritten, 1, 2, A, A, 'carry-induced flip before carry')
    assertThrow(rewritten, 2, 3, A, M, 'carry')
    assertThrow(rewritten, 2, 2, M, M, 'carry-induced flip at old manipulator')

})




/**
 * throws are identified by passer index (i.e. stable, not affected by relabeling)
 */
function assertThrow(throws: Throw[], beat: number, length: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = throws.filter(t => t.throwTime === beat && t.throwLength === length && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length !== 0, `throw ${beat} ${length} ${fromPasserIdx} ${toPasserIdx} not found [${msg}]`)
    assert(ts.length <= 1, `multiple throws found for ${beat} ${length} ${fromPasserIdx} ${toPasserIdx}, expected one [${msg}]`)
}
function assertNoThrow(throws: Throw[], beat: number, fromPasserIdx: number, toPasserIdx: number, msg?: string) {
    const ts = throws.filter(t => t.throwTime === beat && t.fromPasserIdx === fromPasserIdx && t.toPasserIdx === toPasserIdx)

    assert(ts.length ===0, `${ts.length} throw(s) found for ${beat} ${fromPasserIdx} ${toPasserIdx}, expected none [${msg}]`)
}



// test('shifting chopabout', async (t) => {
//     const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33   3pA3 33 -> A
// M: SBcz sAlz SAcz SAlz iAv]. CA`
//     const p = parseGroupSyncPattern(chopabout)

//     //shifting all the way around yields the same pattern
// assert.deepStrictEqual(p[0], shiftPattern(p[0], 24, 12))

//     //shifting once by the length yields the same passing sequence but the opposite takeout sequence
//     assert.deepStrictEqual(p[0][0], shiftPattern(p[0], 12, 12)[0])
//     assert.deepStrictEqual(p[0][1], shiftPattern(p[0], 12, 12)[1])
//     assert.notDeepStrictEqual(p[0][2], shiftPattern(p[0], 12, 12)[2])

//     // printPattern(p[0])
//     // printPattern(shiftPattern(p[0], 2, 12))
//     // printPattern(shiftPattern(p[0], 12, 12))
//     // printPattern(shiftPattern(p[0], 24, 12))

// })

// test('shifting manege', async (t) => {
// //786786786
// //I  C

//     const manege = `A: 7pB 0 6 0   8 0 7pB 0 6-> B
//                     B: 0   8 0 7pA 0 6 0   8 0-> A
//                     M: IB  . . cAf `
//     const p = parseGroupSyncPattern(manege)

//     assert.deepStrictEqual(p[0], shiftPattern(p[0], 18, 9))


//     // printPattern(p[0])
//     // printPattern(shiftPattern(p[0], 3, 9))
//     // printPattern(shiftPattern(p[0], 9, 9))
//     // printPattern(shiftPattern(p[0], 18, 9))

// })

// function printPattern(p: TPatternRow[]) {
//     for (const row of p) {
//         console.log(row.role+":", row.sequence.join("\t"), "\t->", row.relabel)
//     }
// }

// // test('convert chopabout as basic manipulator', async (t) => {
// //     const chopabout = `A: 3pB3 33   3pB3 33   3pB3 33 -> B
// // B: 3pA3 33   3pA3 33   3pA3 33 -> A
// // M: SBcz sAlz SAcz SAlz iAv]. CA`
// //     const p = parseGroupSyncPattern(chopabout)

// //     convertManipulatorPatternToLocal(p[0])
// // })
// test('convert roundabout as basic manipulator', async (t) => {
//     const roundabout = `A: 3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33  -> A
// M: iA . cA z sB z sB`
//     const p = parseGroupSyncPattern(roundabout)

//     convertManipulatorPatternToLocal(p[0])
// })

// test('convert fast-carry roundabout as basic manipulator', async (t) => {
//     const roundabout = `A: 3pB3 33   3pB3 33 -> B
// B: 3pA3 33   3pA3 33  -> A
// M: iA cA z z sB z sB`
//     const p = parseGroupSyncPattern(roundabout)

//     convertManipulatorPatternToLocal(p[0])
// })

// test('convert 456-about as basic manipulator', async (t) => {
//     const chopabout = `A: 5pB040605pB04 -> B
//                        B: 0605pA04060 -> A
//                        M: ..iA`
//     const p = parseGroupSyncPattern(chopabout)

//     convertManipulatorPatternToLocal(p[0])

// })

// test('convert manege as basic manipulator', async (t) => {
//     const manege = `A: 7pB 0 6 0   8 0 7pB 0 6-> B
//     B: 0   8 0 7pA 0 6 0   8 0-> A
//     M: IB  . . cAf `
//     const p = parseGroupSyncPattern(manege)

//     convertManipulatorPatternToLocal(p[0])

// })

// test('manipulator pattern parsing of opernball', async (t) => {
//     const opernball = `A: 3pB 3pB 3   3pB 3pB 3   3pB 3pB 3 -> B
// B: 3pA 3pA 3   3pA 3pA 3   3pA 3pA 3 -> A
// M: SBloz   zf  SBloz   .   IBv^CA  . 
// N: SAloz   .   IAv^CB  .   SBloz   zf  
// O: IBv^CA  .   SAloz   zf  SAloz   .   `
//     const p = parseGroupSyncPattern(opernball)
//     // console.log(p)

//     assert.deepStrictEqual(p[0][0].sequence, ['3pB', '3pB', '3', '3pB', '3pB', '3', '3pB', '3pB', '3'])
//     assert.equal(p[0][0].role, 'A')
//     assert.equal(p[0][0].isManipulator, false)
//     assert.equal(p[0][0].relabel, "B")
//     assert.deepStrictEqual(p[0][2].sequence, ["sBlo", "z", "zf", "sBlo", "z", ".", "iBv^", "cA", "."])
//     assert.equal(p[0][2].role, 'M')
//     assert.equal(p[0][2].isManipulator, true)
//     assert.equal(p[0][2].relabel, undefined)
//     assert.deepStrictEqual(p[0][3].sequence, ["sAlo", "z", ".", "iAv^", "cB", ".", "sBlo", "z", "zf"])
//     assert.equal(p[0][3].role, 'N')
//     assert.equal(p[0][3].isManipulator, true)
//     assert.equal(p[0][3].relabel, undefined)

// })