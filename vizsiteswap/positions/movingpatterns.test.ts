import test from "node:test";
import assert from "node:assert";
import { nextState, Pattern, State } from "./movingpattern.js";



test("state updates in scrambled V", async (t) => {
    const pattern: Pattern = {
        //needed spec
        initialJugglerPositionsOnCircle: [/*A*/ 270, /*B*/90 - 30, /*C*/90 + 30, 0],
        walking: [null, null, 'B'],
        walkPositionChange: [-30, -60],
    
        //from pattern notation
        jugglerLabels: ['A', 'B', 'C', 'M'],
        manipulatorIds: ['M'],// subset of jugglerLabels
        swapManipulator: [[/*beat*/2, /*manipulator name*/'M',/*swap with*/'C']],
        manipulatorPositions: new Map([['M', [['A', 'B'], ['B'], ['C']]]]),
        relabel: new Map([['A', 'B'], ['B', 'C'], ['C', 'A'], ['M', 'M']]),
        passes: [[['M', 'B'], ['B', 'A']], [['A', 'C'], ['C', 'A'], ['B', 'M'], ['M', 'B']], [['A', 'B'], ['B', 'A'], ['C', 'M']]]
    }
    const initialState: State = {
        prior: null,
        positionsOnCircle: pattern.initialJugglerPositionsOnCircle.slice(),
        labels: pattern.jugglerLabels.slice(),
        passes: pattern.passes[0],
        beat: 0
    }

    const initialMJuggler = 3
    const initialCJuggler = 2
    const initialBJuggler = 1
    let state = initialState
    assert(state.beat === 0)
    assert.deepStrictEqual(state.labels, ['A', 'B', 'C', 'M'])
    assert(state.positionsOnCircle[initialCJuggler] === 120)
    assert(state.positionsOnCircle[initialBJuggler] === 60)
    console.log(state.positionsOnCircle)

    state = nextState(state, pattern)
    assert(state.beat === 1)
    assert.deepStrictEqual(state.labels, ['A', 'B', 'C', 'M'])
    
    state = nextState(state, pattern)
    assert(state.beat === 2)
    assert.deepStrictEqual(state.labels, ['A', 'B', 'C', 'M'])
    assert(state.positionsOnCircle[initialCJuggler] === 120)
    
    state = nextState(state, pattern)
    assert(state.beat === 3)
    assert.deepStrictEqual(state.labels, ['B', 'C', 'M', 'A'])
    //M ends up in C's old location
    assert(state.positionsOnCircle[initialMJuggler] === 120)
    
    
    state = nextState(state, pattern)
    state = nextState(state, pattern)
    assert(state.beat === 5)
    //B has walked
    assert(state.positionsOnCircle[initialBJuggler] === -30)
    state = nextState(state, pattern)
    assert(state.beat === 6)
    // initial C ends up where initial B walked to
    assert(state.positionsOnCircle[initialCJuggler] === -30)


    
})