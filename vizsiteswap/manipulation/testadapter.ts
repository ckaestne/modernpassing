import { createGroupPattern } from "@modernpassing/parsing";
import type { ManipulatorAction, Pattern } from "@modernpassing/pattern";

// just adapt old tests to the new interface
export function parseGroupSyncPattern(s: string): [string] {
    return [s]
}
export function createPatternFromRaw(p: string, hands: number): [Pattern, ManipulatorAction[]] {
    const x = createGroupPattern(p, hands, true)
    return [x.aidenNotation![0], x.aidenNotation![1]]

}