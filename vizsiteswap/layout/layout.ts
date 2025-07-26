import type { ManipulatorAction, Pattern } from "@modernpassing/pattern";
import type { AnimationSpec } from "./animation-spec.ts";




export type GroupPattern = {
    pattern: Pattern,
    aidanNotation?: [Pattern, ManipulatorAction[]]
    layout?: GroupPatternLayoutSpec
    videoLinks?: string[];
}
export type GroupPatternLayoutSpec = {
    animation: AnimationSpec,
    background?: BackgroundLayout[]
}


export type BackgroundLayout = BackgroundCircleLayout | BackgroundLineLayout | BackgroundPathLayout
type BackgroundCircleLayout = {
    type: "circle",
    x: number,
    y: number,
    r: number,
    fill: string,
    stroke: string,
    strokeWidth: number
}
type BackgroundLineLayout = {
    type: "line",
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: string,
    strokeWidth: number
}
type BackgroundPathLayout = {
    type: "path",
    segments: (number | string)[],
    stroke: string,
    strokeWidth: number
}


export * from "./animation-spec.ts";
export { createShapeLayout } from "./pattern-shapes.ts";
export type { TLayout, TShape, TMovement, TMovementStep } from "./pattern-shapes.ts";
export {  supportedMovement, supportedShapes } from "./pattern-shapes.ts";
export { loadPathsFromSvg } from "./pattern-paths-loader.ts";
export * from "./animation-plan.ts";
export { createAnimationPlan } from "./create-animation-plan.ts";