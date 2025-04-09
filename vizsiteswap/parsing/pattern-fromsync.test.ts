// deno-lint-ignore-file no-explicit-any no-unused-vars
import assert from "node:assert";
import fs from "node:fs";
import test from "node:test";
import { createSyncPattern } from "./pattern-fromsync.ts";

test("parse simple pattern", async (t) => {
    const p = createSyncPattern("3p33")
    console.log(p.prettyPrintThrows())
})
