import { SRC_PATTERN_PRESETS } from "./srcPatternPresets.ts"

export type PatternType = "sync" | "fourHanded"

export type PresetPattern = {
    name: string
    pattern: string
    patternType: PatternType
}


export const PRESET_PATTERNS: PresetPattern[] = [
    ...SRC_PATTERN_PRESETS,
]
