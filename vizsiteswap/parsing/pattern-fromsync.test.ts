// deno-lint-ignore-file no-explicit-any no-unused-vars
import assert from "node:assert";
import fs from "node:fs";
import test from "node:test";
import { createSyncPattern } from "./pattern-fromsync.ts";
import { createSyncGroupPattern } from "./pattern-fromgroup.ts";

test("parse simple pattern", async (t) => {
    const p = createSyncPattern("3p33")
    assert.ok(p.isValid(), p.getValidationError())
    console.log(p.prettyPrintThrows())
})



test("shorthand notation for separate lines", async (t) => {
    const p = createSyncPattern("3p33, 3p42")
    assert.ok(p.isValid(), p.getValidationError())
    console.log(p.prettyPrintThrows())

    const q = createSyncGroupPattern(`
        A: 3p33
        B: 3p42`).pattern

    assert.equal(p.prettyPrintThrows(), q.prettyPrintThrows())
})

test("shorthand notation for prefixes", async (t) => {
    //prefix is for both parts separately, not a global prefix
    const p = createSyncPattern("3|3p33, 3p42")
    assert.ok(p.isValid(), p.getValidationError())
    console.log(p.prettyPrintThrows())

    const q = createSyncGroupPattern(`
        A: 3|3p33
        B: 3p42`).pattern

    assert.equal(p.prettyPrintThrows(), q.prettyPrintThrows())
})
