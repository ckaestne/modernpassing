import type { Role } from "@modernpassing/pattern"
import type { MovementAnimation, PassAnimation, RelabelAnimation } from "./animation-plan.ts"

export type AnimationPositionInitData = {
    roleIdx: number
    initialRole: Role
    x: number
    y: number
    svgGroupId: string
    svgLabelId: string
}

export type AnimationInitData = {
    svgCanvasId: string
    mod: number
    speed: number
    roleColors: [Role, string][]
    beatIndicatorId?: string
    beatIndicatorXOffsets?: number[]
    beatLabelId?: string
    patternLength: number
    positions: AnimationPositionInitData[]
    passes: PassAnimation[]
    directMovements: MovementAnimation[]
    relabeling: RelabelAnimation[]
}

export type TabInitData = {
    tabId: string
    panelId: string
    active: boolean
}

export type RuntimeInitData = {
    animations?: AnimationInitData
    tabs?: TabInitData[]
}
