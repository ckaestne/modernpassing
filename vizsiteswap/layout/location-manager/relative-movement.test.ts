import assert from "node:assert"
import { createPasserIdx, genPath, helperSvg } from "./helpers.ts"
import test from "node:test";
import { MovementSpec, MovementTracker } from "./relative-movement.ts";


const A = createPasserIdx(0);
const B = createPasserIdx(1);

const AB_initial: MovementSpec[] = [{
    passerIdx: A,
    onBeat: 0,
    duration: 0,
    action: { toX: 0, toY: 0, type: "teleport" }    
},
{
    passerIdx: B,
    onBeat: 0,
    duration: 0,
    action: { toX: 1, toY: 1, type: "teleport" }
},
]

test("basic setup, stationary", () => {
    // two passers, teleport for initial positions, no movement
    const movementTracker = new MovementTracker(6, AB_initial)

    // no movements to resolve
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(10, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(10, B), [1, 1]);

});

const A_simpleWalk: MovementSpec[] = [{
    passerIdx: A,
    onBeat: 2,
    duration: 2,
    action: { fromX: 0, fromY: 0, toX: .5, toY: 0, path: [], type: "resolved" },
},
{
    passerIdx: A,
    onBeat: 4,
    duration: 2,
    action: { fromX: .5, fromY: 0, toX: 0, toY: 0, path: [], type: "resolved" },
}]

test("basic setup, simple walk", () => {
    // two passers, teleport for initial positions, A walks back and forth
    const movementTracker = new MovementTracker(6, [...AB_initial, ...A_simpleWalk])

    // no movements to resolve
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
});

test("resolve takePosition without further dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        { passerIdx: B, onBeat: 3, duration: 0, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" } },
        { passerIdx: B, onBeat: 4, duration: 1, action: { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [], type: "resolved" } }
    ])

    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolveNextMovement();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);

    // B
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
});



test("resolve takePosition with a walk without further dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        { passerIdx: B, onBeat: 2, duration: 1, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" }},
        { passerIdx: B, onBeat: 4, duration: 1, action: { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [], type: "resolved" } }
    ])

    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolveNextMovement();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);

    // B walking
    assert.deepEqual(movementTracker._getLocation(2, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
});


test("resolve takePosition with indirect dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        { passerIdx: B, onBeat: 2, duration: 1, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" } }, // walk to where A is at 3
        { passerIdx: B, onBeat: 3, duration: 1, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" } }, // then walk from there to where A is at 4; this requires resolving the first walk
        { passerIdx: B, onBeat: 4, duration: 1, action: { fromX: .5, fromY: 0, toX: 1, toY: 1, path: [], type: "resolved" } }  // walk back to original position
    ])


    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolve();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6, B), [1, 1]);

    // B first part to .25,0
    assert.deepEqual(movementTracker._getLocation(2, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    // B second part to .5,0
    assert.deepEqual(movementTracker._getLocation(3.5, B), [.75 / 2, 0]);
    assert.deepEqual(movementTracker._getLocation(4, B), [.5, 0]);
    // B go home to 1,1
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.5 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);

});



test("resolve takePosition with reverse-order indirect dependencies", () => {
    // B takes A's position and then walks back
    let movementTracker = new MovementTracker(6, [
        ...AB_initial, ...A_simpleWalk,
        { passerIdx: B, onBeat: 2, duration: 1, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" } }, // walk to where A is at 3 from the end of the previous walk on 5
        { passerIdx: B, onBeat: 4, duration: 1, action: { fromX: .25, fromY: 0, toX: 1, toY: 1, path: [], type: "resolved" } }, // walk back to original position
        { passerIdx: B, onBeat: 5, duration: 3, action: { positionSpec: { type: "take", toPasserIdx: A }, type: "unresolved" } }, // 
    ])


    assert(movementTracker.hasUnresolvedMovements());
    movementTracker = movementTracker.resolve();
    assert(!movementTracker.hasUnresolvedMovements());

    assert.deepEqual(movementTracker._getLocation(0, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2, A), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(3, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4, A), [0.5, 0]);
    assert.deepEqual(movementTracker._getLocation(5, A), [0.25, 0]);
    assert.deepEqual(movementTracker._getLocation(6, A), [0, 0]);

    // B walk to A on 5
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);
    assert.deepEqual(movementTracker._getLocation(6.5, B), [0.5, 0.5]);
    assert.deepEqual(movementTracker._getLocation(8, B), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(0.5, B), [0.5, 0.5]);
    assert.deepEqual(movementTracker._getLocation(2, B), [0, 0]);
    // B first part to .25,0
    assert.deepEqual(movementTracker._getLocation(2, B), [0, 0]);
    assert.deepEqual(movementTracker._getLocation(2.5, B), [0.25 / 2, 0]);
    assert.deepEqual(movementTracker._getLocation(3, B), [.25, 0]);
    // B go home to 1,1
    assert.deepEqual(movementTracker._getLocation(4, B), [.25, 0]);
    assert.deepEqual(movementTracker._getLocation(4.5, B), [(0.25 + 1) / 2, 0.5]);
    assert.deepEqual(movementTracker._getLocation(5, B), [1, 1]);

});