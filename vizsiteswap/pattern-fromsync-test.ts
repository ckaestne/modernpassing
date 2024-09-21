import assert from "node:assert";
import fs from "node:fs";
import test from "node:test";
import { parseSyncPattern } from "./pattern-fromsync.js";
import { replaceElement } from "./replace-util.js";

test("parse simple pattern", async (t) => {
    parseSyncPattern("3 -> (3px,4) 3(3,3p),333")
})

test("parse patterns from sync.md", async (t) => {

    const fileContent = fs.readFileSync("test/sync.md", "utf-8")

    const ps: string[] = []
    const result = replaceElement("sync", fileContent, (match: string, inner: string, config: any) => {
        ps.push(inner)
        return ""
    })

    for (const p of ps) {
        try {
            parseSyncPattern(p)
        } catch (e) {
            console.log("failed to parse ",p)
            throw e
        }
    }

})

test("reject invalid patterns", async (t) => {
    //assert exception
    assert.throws(() => parseSyncPattern("3,33"))
    assert.throws(() => parseSyncPattern("3h,33"))
    assert.throws(() => parseSyncPattern("3(3,3)3,33"))
})
