
import type { AnimationSpec } from "@modernpassing/layout";
import assert from "node:assert";
import { createGroupPattern } from "../parsing/parsing.ts";
// import { applyManipulatorAnimationLayout, getAbstractPositionsFromPattern, resolveManipulatorPositionAndRotation } from "./manipulator-layout.ts";


// Deno.test.ignore('test infrastructure', () => {
//     const g = createGroupPattern(
//         `A: 3pB 3 3 3 -- B
//         B: 3pA 3 3 3 -- A
//         M: SAB
//         positions: Line(A,B)`
//         , 2)

//     console.log(g.pattern.prettyPrintThrows())
//     assert.ok(g.pattern.isValid(), g.pattern.getValidationError())

//     // console.log(g.layout)
//     const newLayout= applyManipulatorAnimationLayout(g.pattern, g.layout!.animation!)
//     console.log(newLayout)


// })

// Deno.test('basics of abstract positions', () => {

//     const p = createGroupPattern(
//         `A: 3pB3 33   3pB3 33 -- B
//         B: 3pA3 33   3pA3 33  -- A
//         M: SB z SB z  IB . CB z `
//     ,2)

//     console.log(p.pattern.prettyPrintThrows())
//     const [pos, mov] = getAbstractPositionsFromPattern(p.pattern)

//     // console.log("Abstract manipulator positions:", pos)
//     // console.log("Abstract manipulator movements:", mov)

//     assert(pos.some(p => p.role === "M" && p.beat === 0 && p.between[0] === "A" && p.between[1] === "B"), "first substitution")
//     assert(pos.some(p => p.role === "M" && p.beat === 2 && p.between[0] === "B" && p.between[1] === "B"), "second substitution")
//     assert(pos.some(p => p.role === "M" && p.beat === 4 && p.between[0] === "A" && p.between[1] === "B"), "intercept")
//     assert(pos.some(p => p.role === "M" && p.beat === 6 && p.between[0] === "B" && p.between[1] === "B"), "carry")

//     assert(mov.some(m => m.role === "M" && m.to==="B" && m.beat === 6.5), "first movement")

// })

// Deno.test('abstract positions of opernball', () => {

//     const p = createGroupPattern(
//         `A: 3pB  3pB 3   3pB  3pB 3   3pB  3pB 3 -- B
//          B: 3pA  3pA 3   3pA  3pA 3   3pA  3pA 3 -- A
//          O: IBvb CA  .   SAlo z   zf  SAlo z   .   
//          N: SAlo z   .   IAvb CB  .   SBlo z   zf  
//          M: SBlo z   zf  SBlo z   .   IBvb CA  . 
//          `
//     ,2)

//     console.log(p.pattern.prettyPrintThrows())
//     const [pos, mov] = getAbstractPositionsFromPattern(p.pattern)

//     console.log("Abstract manipulator positions:", pos)
//     console.log("Abstract manipulator movements:", mov)
// })


// Deno.test('manipulator position computations', () => {
//     const initial: AnimationLayout = {
//         initialPositions: [
//             { role: "A", x: 0, y: .5 },
//             { role: "B", x: 1, y: .5 },
//         ],
//         passAnimations: [],
//         movementSegments: [],
//         movementSequences: [],
//         movementTriggers: [],
//         relabeling: [],
//         speed: 1
//     }
//     const initialD: AnimationLayout = {
//         initialPositions: [
//             { role: "A", x: 0, y: 0 },
//             { role: "B", x: 1, y: 1 },
//         ],
//         passAnimations: [],
//         movementSegments: [],
//         movementSequences: [],
//         movementTriggers: [],
//         relabeling: [],
//         speed: 1
//     }


//     assert.deepEqual(resolveManipulatorPositionAndRotation(initial, {
//         beat: 0,
//         role: "M",
//         between: ["A", "B"],
//         side: 0.5,
//         offset: 0,
//         direction: 0
//     }),[0.5, 0.5, 0])
//     assert.deepEqual(resolveManipulatorPositionAndRotation(initial, {
//         beat: 0,
//         role: "M",
//         between: ["B", "A"],
//         side: 0.5,
//         offset: 0,
//         direction: 0
//     }),[0.5, 0.5, 180])
//     assert.deepEqual(resolveManipulatorPositionAndRotation(initial, {
//         beat: 0,
//         role: "M",
//         between: ["A", "B"],
//         side: 0.5,
//         offset: 0,
//         direction: 90
//     }),[0.5, 0.5, 90])
//     assert.deepEqual(resolveManipulatorPositionAndRotation(initial, {
//         beat: 0,
//         role: "M",
//         between: ["A", "B"],
//         side: 0,
//         offset: 0,
//         direction: 0
//     }),[1, 0.5, 0])
//     assert.deepEqual(resolveManipulatorPositionAndRotation(initial, {
//         beat: 0,
//         role: "M",
//         between: ["A", "B"],
//         side: 0,
//         offset: .1,
//         direction: 0
//     }),[1, 0.6, 0])
    

//     assert.deepEqual(resolveManipulatorPositionAndRotation(initialD, {
//         beat: 0,
//         role: "M",
//         between: ["A", "B"],
//         side: 0.5,
//         offset: 0,
//         direction: 0
//     }),[0.5, 0.5, 45])
        

// })





// Deno.test('initial position for manipulators', () => {

//     const p = createGroupPattern(
//         `A: 3pB3 33   3pB3 33 -- B
//         B: 3pA3 33   3pA3 33  -- A
//         M: SB z SB z  IB . CB  
//         N: SA z SA z IA . C 
//         positions: Line(A,B)`
//     ,2)

//     console.log(p.pattern.prettyPrintThrows())
//     const newLayout = applyManipulatorAnimationLayout(p.pattern, p.layout!.animation!)

//     console.log(newLayout.initialPositions)


//     assert(newLayout.initialPositions.some(pos => pos.role === "M" && pos.x === 0.5&& pos.direction===90), "M initial position in the middle of the pattern")
//     assert(newLayout.initialPositions.some(pos => pos.role === "N" && pos.x === 0.5 && pos.direction===270), "N initial position in the middle of the pattern")

//         console.log("Direct movements:", newLayout.directMovements)


// })



// Deno.test('direct movement for manipulators', () => {

//     const p = createGroupPattern(
//         `A: 3pB3 33   3pB3 33 -- B
//         B: 3pA3 33   3pA3 33  -- A
//         M: SB z SB z  IB . CB  
//         N: SA z SA z IA . C 
//         positions: Line(A,B)`
//     ,2)

//     console.log(p.pattern.prettyPrintThrows())
//     const newLayout = applyManipulatorAnimationLayout(p.pattern, p.layout!.animation!)

//         console.log("Direct movements:", newLayout.directMovements)

//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 1 && mov.role === "M" && mov.direction === 90), "move in front of B")
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 3 && mov.role === "M" && mov.direction === 180), "intercept to B")
//         // assert(newLayout.directMovements!.some(mov => mov.onBeat === 4 && mov.role === "M" && mov.x===1), "replace B's position") // is this still M?
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 5 && mov.role === "M" /*&& mov.direction===0*/), "carry back to new B") // this should be the new M
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 7 && mov.role === "M" /*&& mov.direction===270*/), "get ready to substitute the pass")
        
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 1 && mov.role === "N" /*&& mov.direction === 270*/), "move in front of A")
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 3 && mov.role === "N" && mov.direction === 0), "intercept to A")
//         // assert(newLayout.directMovements!.some(mov => mov.onBeat === 4 && mov.role === "N" && mov.x===0), "replace A's position") // is this still M?
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 5 && mov.role === "N" /*&& mov.direction===180*/), "carry back to new A")
//         assert(newLayout.directMovements!.some(mov => mov.onBeat === 7 && mov.role === "N" /*&& mov.direction===270*/), "get ready to substitute the pass")

// })
