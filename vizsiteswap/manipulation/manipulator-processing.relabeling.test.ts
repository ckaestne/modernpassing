import { createPatternFromRaw, parseGroupSyncPattern } from "./testutils.ts"
import { describe, it } from "jsr:@std/testing/bdd"
import assert from "node:assert"
import test from "node:test"
import { applyManipulations } from "./manipulator-processing.ts"

const twoPersonFourBeatPattern = createPatternFromRaw(
    parseGroupSyncPattern(
        `A: 3 3 3 3 -- B
        B: 3 3 3 3 -- A`,
    )[0],
    2,
)[0]

const twoPersonFourBeatPatternWithInterceptOnOne = (() => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3  3 3 -- B
         B: 3 3  3 3 -- A
         M: . IB C`,
        )[0],
        2,
    )
    return applyManipulations(p, manipulations)
})()
const twoPersonFourBeatPatternWithInterceptOnZeroA = (() => {
    const [p, manipulations] = createPatternFromRaw(
        parseGroupSyncPattern(
            `A: 3 3  3 3 -- B
         B: 3 3  3 3 -- A
         M: IA C`,
        )[0],
        2,
    )
    return applyManipulations(p, manipulations)
})()

describe("Pattern.getRole (without intercepts)", () => {
    const p = twoPersonFourBeatPattern

    it("should return roles within the current pattern", () => {
        for (const beat of [0, 1, 2, 3]) {
            assert.equal(p.getRole(beat, 0), "A")
            assert.equal(p.getRole(beat, 1), "B")
        }
    })
    it("should return wrap around forward correctly", () => {
        for (const beat of [4, 5, 6, 7]) {
            assert.equal(p.getRole(beat, 0), "B")
            assert.equal(p.getRole(beat, 1), "A")
        }
        for (const beat of [8, 9, 10, 11]) {
            assert.equal(p.getRole(beat, 0), "A")
            assert.equal(p.getRole(beat, 1), "B")
        }
    })
    it("should return wrap around backward correctly", () => {
        for (const beat of [-1, -2, -3, -4]) {
            assert.equal(p.getRole(beat, 0), "B")
            assert.equal(p.getRole(beat, 1), "A")
        }
        for (const beat of [-5, -6, -7, -8]) {
            assert.equal(p.getRole(beat, 0), "A")
            assert.equal(p.getRole(beat, 1), "B")
        }
    })
})

describe("Pattern.getRole (with intercept)", () => {
    const p = twoPersonFourBeatPatternWithInterceptOnOne
    // console.log(p.prettyPrintThrows())

    it("should return roles before intercept", () => {
        for (const beat of [0, 1]) {
            assert.equal(p.getRole(beat, 0), "A")
            assert.equal(p.getRole(beat, 1), "B")
            assert.equal(p.getRole(beat, 2), "M")
        }
    })
    it("should return adjusted roles after intercept", () => {
        for (const beat of [2, 3]) {
            assert.equal(p.getRole(beat, 0), "A")
            assert.equal(p.getRole(beat, 1), "M")
            assert.equal(p.getRole(beat, 2), "B")
        }
    })
    it("should wrap around forward correctly", () => {
        for (const beat of [4, 5]) {
            assert.equal(p.getRole(beat, 0), "B")
            assert.equal(p.getRole(beat, 1), "M")
            assert.equal(p.getRole(beat, 2), "A")
        }
    })
    it("should swap roles correctly after wraparound forward", () => {
        for (const beat of [6, 7]) {
            assert.equal(p.getRole(beat, 0), "M")
            assert.equal(p.getRole(beat, 1), "B")
            assert.equal(p.getRole(beat, 2), "A")
        }
    })
    it("should swap wraparound forward again correctly", () => {
        for (const beat of [8, 9]) {
            assert.equal(p.getRole(beat, 0), "M")
            assert.equal(p.getRole(beat, 1), "A")
            assert.equal(p.getRole(beat, 2), "B")
        }
    })
    it("should swap wraparound backward correctly", () => {
        for (const beat of [-1, -2]) {
            assert.equal(p.getRole(beat, 0), "B")
            assert.equal(p.getRole(beat, 1), "A")
            assert.equal(p.getRole(beat, 2), "M")
        }
    })
    it("should swap wraparound backward correctly over prior swap", () => {
        for (const beat of [-3, -4]) {
            assert.equal(p.getRole(beat, 0), "M")
            assert.equal(p.getRole(beat, 1), "A")
            assert.equal(p.getRole(beat, 2), "B")
        }
    })
    it("should swap wraparound backward again", () => {
        for (const beat of [-5, -6]) {
            assert.equal(p.getRole(beat, 0), "M")
            assert.equal(p.getRole(beat, 1), "B")
            assert.equal(p.getRole(beat, 2), "A")
        }
    })
    it("should swap wraparound backward again with prior swap", () => {
        for (const beat of [-7, -8]) {
            assert.equal(p.getRole(beat, 0), "B")
            assert.equal(p.getRole(beat, 1), "M")
            assert.equal(p.getRole(beat, 2), "A")
        }
    })
})

describe("Pattern.getRowIdxByRole", () => {
    const p = twoPersonFourBeatPatternWithInterceptOnOne

    it("should return initial rows on beat 0", () => {
        const initialRoles = p.roles[0][1]
        for (const beat of [0, 1]) {
            for (const [i, role] of initialRoles.entries()) {
                assert.equal(p.getRowIdxByRole(beat, role), i)
            }
        }
    })
    it("should handle swap after intercept", () => {
        const roles = ["A", "M", "B"]
        for (const beat of [2, 3]) {
            for (const [i, role] of roles.entries()) {
                assert.equal(p.getRowIdxByRole(beat, role), i)
            }
        }
    })
    it("should handle wraparound with full relabeling", () => {
        const roles = ["B", "M", "A"]
        for (const beat of [4, 5]) {
            for (const [i, role] of roles.entries()) {
                assert.equal(p.getRowIdxByRole(beat, role), i)
            }
        }
    })
    it("should handle wraparound backward with full relabeling", () => {
        const roles = ["B", "A", "M"]
        for (const beat of [-1, -2]) {
            for (const [i, role] of roles.entries()) {
                assert.equal(p.getRowIdxByRole(beat, role), i)
            }
        }
    })
    it("should handle wraparound backward with full relabeling and intercept", () => {
        const roles = ["M", "A", "B"]
        for (const beat of [-3, -4]) {
            for (const [i, role] of roles.entries()) {
                assert.equal(p.getRowIdxByRole(beat, role), i)
            }
        }
    })
})

// describe("Pattern.getRowIdxByRoleRelative", () => {
//     const p = twoPersonFourBeatPatternWithInterceptOnOne

//     it("should return initial rows on beat 0", () => {
//         const initialRoles = p.roles[0][1]
//         for (const beat of [0,1])
//             for (const [i, role] of initialRoles.entries())
//                 assert.equal(p.getRowIdxByRoleRelative(beat, role), i)
//     })
//     it("should handle swap after intercept", () => {
//         const roles = ['A', 'M', 'B']
//         for (const beat of [2,3])
//             for (const [i, role] of roles.entries())
//                 assert.equal(p.getRowIdxByRoleRelative(beat, role), i)
//     })
//     it("should keep rows stable with relabeling", () => {
//         const roles = ['B', 'M', 'A']
//         for (const beat of [4,8,12])
//             for (const role of roles)
//                 assert.equal(p.getRowIdxByRoleRelative(beat, role), p.getRowIdxByRoleRelative(beat-1, role), `expected the same rowIdx for role ${role} on beat ${beat} and ${beat-1}, but got ${p.getRowIdxByRoleRelative(beat, role)} and ${p.getRowIdxByRoleRelative(beat-1, role)}`)
//     })
//     it("should keep rows stable with relabeling but then handle next intercept swap (unintuitive change now)", () => {
//         const roles = ['M', 'A', 'B']
//         for (const beat of [-1,-2])
//             for (const [i, role] of roles.entries())
//                 assert.equal(p.getRowIdxByRoleRelative(beat, role), i)
//     })
//     it("should handle going backward without relabeling", () => {
//         const roles = ['A', 'B', 'M']
//         for (const beat of [-1,-2])
//             for (const [i, role] of roles.entries())
//                 assert.equal(p.getRowIdxByRoleRelative(beat, role), i)
//     })
// })

// describe("Pattern.getRoleRelative (without intercepts)", () => {
//     const p = twoPersonFourBeatPattern

//     it("should return roles within the current pattern", () => {
//         for (const beat of [0, 1, 2, 3]) {
//             assert.equal(p.getRoleRelative(beat, 0), "A")
//             assert.equal(p.getRoleRelative(beat, 1), "B")
//         }
//     })
//     it("should not be affected by wraparound forward", () => {
//         for (const beat of [4,5,6,7,8,9,10,11]) {
//             assert.equal(p.getRoleRelative(beat, 0), "A")
//             assert.equal(p.getRoleRelative(beat, 1), "B")
//         }
//     })
//     it("should not be affected by wraparound forward", () => {
//         for (const beat of [-1,-2,-3,-4,-5,-6,-7,-8]) {
//             assert.equal(p.getRoleRelative(beat, 0), "A")
//             assert.equal(p.getRoleRelative(beat, 1), "B")
//         }
//     })
// })

test("some ad-hoc tests", () => {
    const p = twoPersonFourBeatPatternWithInterceptOnOne

    console.log(p.prettyPrintThrows())

    // self from A on last beat goes to B's row
    assert.equal(p.getRole(3, 0), "A")
    assert.equal(p.getRole(4, 0), "B")

    // zip from M should go back to B's row, but still be M
    assert.equal(p.getRole(0, 2), "M")
    assert.equal(p.getRole(-1, 2), "M")
    assert.equal(p.getRole(-4, 2), "B")

    // empty hand from M should go back to B's row, but still be M
    assert.equal(p.getRole(0, 2), "M")
    assert.equal(p.getRole(-2, 2), "M")
    assert.equal(p.getRole(-4, 2), "B")

    // zip from relabeled M should go back to M
    assert.equal(p.getRole(2, 2), "B")
    assert.equal(p.getRole(1, 2), "M")
    assert.equal(p.getRole(-1, 2), "M")

    // zip from relabeled M should go back to M
    assert.equal(p.getRole(2, 1), "M")
    assert.equal(p.getRole(1, 1), "B")
    assert.equal(p.getRole(-1, 1), "A")
    // zip from relabeled M should go back to M
    assert.equal(p.getRole(2, 0), "A")
    assert.equal(p.getRole(1, 0), "A")
    assert.equal(p.getRole(-1, 0), "B")
})

test("some more ad-hoc tests", () => {
    const p = twoPersonFourBeatPatternWithInterceptOnZeroA

    console.log(p.prettyPrintThrows())

    // self from A on last beat goes to B's row
    assert.equal(p.getRole(3, 2), "A")
    assert.equal(p.getRole(4, 2), "B")

    // zip from A after swap should go back to M
    assert.equal(p.getRole(1, 2), "A")
    assert.equal(p.getRole(0, 2), "M")
    assert.equal(p.getRole(-1, 2), "M")

    //     // empty hand from M should go back to B's row, but still be M
    //     assert.equal(p.getRole(0, 2), "M")
    //     assert.equal(p.getRole(-2, 2), "M")
    //     assert.equal(p.getRole(-4, 2), "B")

    //     // zip from relabeled M should go back to M
    //     assert.equal(p.getRole(2, 2), "B")
    //     assert.equal(p.getRole(1, 2), "M")
    //     assert.equal(p.getRole(-1, 2), "M")

    //     // zip from relabeled M should go back to M
    //     assert.equal(p.getRole(2, 1), "M")
    //     assert.equal(p.getRole(1, 1), "B")
    //     assert.equal(p.getRole(-1, 1), "A")
    //     // zip from relabeled M should go back to M
    //     assert.equal(p.getRole(2, 0), "A")
    //     assert.equal(p.getRole(1, 0), "A")
    //     assert.equal(p.getRole(-1, 0), "B")
})
