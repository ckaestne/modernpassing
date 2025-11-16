/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import assert from "node:assert";
import type { Hand, Role } from "../pattern/pattern.ts";
import type { AnimationPlan, DirectMovementAnimation, PassAnimation, RelabelAnimation, SegmentMovementAnimation } from "./animation-plan.ts";
import type { AnimationSpec, BetweenPositionSpec, PassSpec, RelabelSpec } from "./animation-spec.ts";
import type { MovementSegmentSpec } from "./layout.ts";
import { genPath, helperSvg } from "./location-manager/helpers.ts";
import { createFullLocationManager } from "./location-manager/location-manager.ts";
import { LocationManager } from "./location-manager/base-location-manager.ts";



/**
 * creates the animation plan
 * @param animationSpec 
 * @param canvasSizeByPasserCircle Size of the canvas relative to the size of a circle representing a passer
 *      for example, a 200px canvas with a passer circle of 20px would be 10.
 *      While all animations are rendered on relative locations from 0 to 1, this is needed to scale animations to the circle size, especially the length of arms for passes
 * @returns 
 */
export function createAnimationPlan(animationSpec: AnimationSpec, canvasSizeByPasserCircle: number): AnimationPlan {
    throw new Error("createAnimationPlan is currently disabled for editing.");
    // // all roles, this is used to create ids
    // const roles = animationSpec.initialPositions.map(pos => pos.role)
    // function passerId(role: Role): number { return roles.indexOf(role) }

    // const locationMgr = createFullLocationManager(animationSpec);



    // const movementSegments = animationSpec.baseMovementSegments
    // // segments are already computed as a side effect of indexing locations in the locationMgr
    // const segmentMovementAnimations: SegmentMovementAnimation[] = convertBaseMovement(locationMgr, animationSpec)

    // // relative movements add manipulator movements; creating animations and also adding computed manipulator positions to the location manager
    // const [directMovementAnimations, updateLocationMgr]: [DirectMovementAnimation[], LocationMgr] = computeRelativeMovements(animationSpec.relativeMovements, locationMgr)

    // const passAnimations: PassAnimation[] = animationSpec.passAnimations.flatMap(convertPassAnimation(updateLocationMgr, canvasSizeByPasserCircle))
    // const relabeling: RelabelAnimation[] = convertRelabeling(locationMgr, animationSpec.relabeling)

    // // initial positions is trivial
    // const initialPositions = updateLocationMgr.initialPositions.map(i => ({
    //     passerId: passerId(i[0]),
    //     x: i[1],
    //     y: i[2],
    //     initialRole: i[0]
    // }))

    // return {
    //     mod: locationMgr.mod,
    //     initialPositions,
    //     passAnimations,
    //     movementSegments,
    //     segmentMovementAnimations,
    //     directMovementAnimations,
    //     relabeling
    // }

}

// function convertPassAnimation(locationMgr: LocationManager, canvasSizeByPasserCircle: number): (passSpec: PassSpec) => PassAnimation[] {
//     const relativeArmLength = 1 / canvasSizeByPasserCircle * .9
//     return (passSpec: PassSpec): PassAnimation[] => {

//         const result: PassAnimation[] = []
//         for (let time = passSpec.onBeat; time < locationMgr.mod; time += passSpec.mod) {
//             const [fromX, fromY] = locationMgr.getLocationByRole(time, passSpec.pass.fromRole)
//             // get location for the "to" position, at the beat that the pass arrives (role may have changed, we use the role at the time the pass is thrown to identify the target passer)
//             // for zaps (pelfs in takeouts), we use the location where the passer starts, not the location where they will be when the arrow is no longer shown
//             const passArrivalTime = passSpec.throwLength <= 2 ? time : time + passSpec.displayDuration
//             const toRoleAtThrow = passSpec.pass.toRole
//             const [toX, toY] = locationMgr.getFutureLocationByRole(passArrivalTime % locationMgr.mod, time, toRoleAtThrow)

//             if (passSpec.onBeat === 3 && passSpec.pass.toRole === "M") {
//                 console.log("debug-pass", { time, passArrivalTime, from: [fromX, fromY], to: [toX, toY] })
//             }

//             // in the first iteration, a walking passer might start in the wrong space, we need to handle this separately
//             // TODO for now let's just assume the passer is not also walking immediately on beat 0 and is not walking longer to deal with passes on other beats
//             let firstIteration = undefined
//             if (time == 0) {
//                 const [, initialX, initialY] = locationMgr.initialPositions.find(i => i[0] === passSpec.pass.toRole)!
//                 if (Math.abs(initialX - toX) > 0.001 || Math.abs(initialY - toY) > 0.001) {
//                     firstIteration = false
//                     const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
//                         computePass(fromX, fromY, passSpec.pass.fromHand, initialX, initialY, passSpec.pass.toHand, relativeArmLength, 0.01)
//                     result.push({
//                         onBeat: time,
//                         duration: passSpec.displayDuration,
//                         firstIteration: true,

//                         fromX: fromHandX,
//                         toX: toHandX,
//                         fromY: fromHandY,
//                         toY: toHandY,
//                         labelX: labelHandX,
//                         labelY: labelHandY,
//                         label: passSpec.pass.label,
//                         debug_center: {
//                             fromX: fromX,
//                             fromY: fromY,
//                             toX: initialX,
//                             toY: initialY,
//                         }
//                     })
//                 }
//             }

//             const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
//                 computePass(fromX, fromY, passSpec.pass.fromHand, toX, toY, passSpec.pass.toHand, relativeArmLength, 0.01)
//             result.push({
//                 onBeat: time,
//                 duration: passSpec.displayDuration,
//                 firstIteration,

//                 fromX: fromHandX,
//                 toX: toHandX,
//                 fromY: fromHandY,
//                 toY: toHandY,
//                 labelX: labelHandX,
//                 labelY: labelHandY,
//                 label: passSpec.pass.label,
//                 debug_center: {
//                     fromX,
//                     toX,
//                     fromY,
//                     toY
//                 }
//             })
//         }
//         return result
//     }

// }


// function convertBaseMovement(locationMgr: LocationMgr, animationSpec: AnimationSpec): SegmentMovementAnimation[] {
//     const result: SegmentMovementAnimation[] = [];
//     for (const m of locationMgr.movements) {
//         result.push({
//             onBeat: m.onBeat % locationMgr.mod,
//             role: m.role,//TODO this probably needs to change for animations
//             duration: m.duration,

//             segmentIdx: animationSpec.baseMovementSegments.indexOf(m.segment),
//             fraction: 1
//         })
//     }

//     return result
// }

// function convertRelabeling(locationMgr: LocationMgr, relabelingSpecs: RelabelSpec): RelabelAnimation[] {
//     assert(locationMgr.basePatternRoles[0][0] === 0, "Relabeling must start at beat 0.");

//     const result: RelabelAnimation[] = [];
//     for (let time = 0; time < locationMgr.mod; time++) {
//         for (const relabel of relabelingSpecs.relabelActions) {
//             if (time % relabel.mod === Math.floor(relabel.onBeat)) {
//                 result.push({
//                     onBeat: time,
//                     changes: relabel.changes
//                 })
//             }
//         }
//     }
//     return result;
// }




// /** from animations.ts */

// /**
//  *     const [fromX, fromY, toX, toY, labelX, labelY] = computePass(x1, y1, fromHand, x2, y2, toHand)
//  * @param x1 
//  * @param y1 
//  * @param hand1 
//  * @param x2 
//  * @param y2 
//  * @param hand2 
//  * @param armLength 
//  * @param labelDistance 
//  * @returns 
//  */
// function computePass(x1: number, y1: number, hand1: Hand, x2: number, y2: number, hand2: Hand, armLength: number, labelDistance: number): [number, number, number, number, number, number] {
//     //angle between the two points
//     const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
//     //move 20 pixel 45 degree from that angle from the first point
//     const armAngle = 40 //todo make this configurable
//     const throwOutside = 1

//     const direction1 = hand1 === 0 ? armAngle : -armAngle
//     const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
//     const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

//     const direction2 = hand2 === 0 ? armAngle * throwOutside : -armAngle * throwOutside
//     const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
//     const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

//     const length = Math.sqrt((x3 - x4) ** 2 + (y3 - y4) ** 2)

//     let labelX = (x3 + x4) / 2
//     let labelY = (y3 + y4) / 2

//     const passAngle = Math.atan2(y4 - y3, x4 - x3) * 180 / Math.PI

//     const labelAngle =
//         hand1 === 0 && hand2 === 1 ? 90 : // right hand pass to the right
//             hand1 === 1 && hand2 === 0 ? 90 : // left hand pass to the left
//                 hand1 === 0 && hand2 === 0 ? -90 :
//                     90 // crossing pass toward the target

//     //sideways adjustment for label
//     // if (labelAngle !== 0) {
//     labelX += labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
//     labelY += labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
//     // }
//     //forward adjustment for label
//     labelX += length / 4 * Math.cos(passAngle * Math.PI / 180)
//     labelY += length / 4 * Math.sin(passAngle * Math.PI / 180)


//     return [x3, y3, x4, y4, labelX, labelY]
// }



// /** helper functions */
// function same(a: number[][], b: number[][]): boolean {
//     if (a.length !== b.length) return false;
//     for (let i = 0; i < a.length; i++) {
//         if (a[i].length !== b[i].length) return false;
//         for (let j = 0; j < a[i].length; j++) {
//             if (a[i][j] !== b[i][j]) return false;
//         }
//     }
//     return true;
// }
// function same2(a: Role[], b: Role[]): boolean {
//     if (a.length !== b.length) return false;
//     for (let i = 0; i < a.length; i++) {
//         if (a[i] !== b[i]) return false;
//     }
//     return true;
// }

// function computeRelativeMovements(relativeMovements: RelativeMovementSpec[], locationMgr: LocationMgr): [DirectMovementAnimation[], LocationMgr] {

//     const directMovementAnimations: DirectMovementAnimation[] = [];
//     for (let startTime = 0; startTime < locationMgr.mod; startTime++) {
//         for (const relativeMovementSpec of relativeMovements) {
//             if (startTime % relativeMovementSpec.mod === Math.floor(relativeMovementSpec.onBeat)) {
//                 // we need to compute the position of the manipulator at this time
//                 let toX: number, toY: number;
//                 const arrivalTime = Math.floor((startTime + relativeMovementSpec.onBeat % 1 + relativeMovementSpec.duration) % locationMgr.mod);
//                 const roleTime = relativeMovementSpec.targetRoleTime === "onBeat" ? startTime : arrivalTime
//                 // const roleAtArrival = pattern

//                 // console.log("computeRelativeMovement", time, locationTime, relativeMovementSpec)
//                 let takeRelativeMovementFrom: [number, Role] | undefined = undefined
//                 if (relativeMovementSpec.positionSpec.type === "take") {
//                     [toX, toY] = locationMgr.getFutureLocationByRole(arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
//                     // after we "take" a position, we continue that animation if it is moving on an animation -- we record the role+beat of that animation to find it in the frontend
//                     takeRelativeMovementFrom = locationMgr.findOngoingAnimationByRole(roleTime, relativeMovementSpec.positionSpec.toRole)
//                 } else if (relativeMovementSpec.positionSpec.type === "between") {
//                     [toX, toY] = computePositionBetween(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec)
//                 } else if (relativeMovementSpec.positionSpec.type === "infront") {
//                     [toX, toY] = computePositionInFrontOf(locationMgr, arrivalTime, roleTime, relativeMovementSpec.positionSpec.toRole)
//                 } else { throw new Error(`Unknown position spec type: ${relativeMovementSpec.positionSpec}`); }

//                 directMovementAnimations.push({
//                     onBeat: startTime + relativeMovementSpec.onBeat % 1, // onBeat
//                     role: relativeMovementSpec.role,//TODO this is the role when the passer is leaving. we need the role when they arrive, because that's what we are tracking here
//                     roleAtArrival: relativeMovementSpec.roleAtMovementEnd,
//                     duration: relativeMovementSpec.duration,
//                     toX,
//                     toY,
//                     bend: relativeMovementSpec.bend,
//                     takeRelativeMovementFrom
//                 })
//             }
//         }
//     }

//     // get the set of distinct roles in directMovementAnimations.role that are not yet included in locationMgr.initialPositions
//     const existingRoles = new Set(locationMgr.initialPositions.map(pos => pos[0]));
//     const newRoles = new Set(
//         directMovementAnimations
//             .map(anim => anim.role)
//             .filter(role => !existingRoles.has(role))
//     )
//     const newInitialPositions: [Role, number, number][] = [...locationMgr.initialPositions]
//     const manipulatorPositions = new Map<Role, [number, number, number][]>()
//     // initial position of the manipulator is where their first movement ended (starting there, not moving to there from another position)
//     for (const role of newRoles) {
//         const roleMovementsByArrival = directMovementAnimations.filter(anim => anim.roleAtArrival === role).slice().sort((a, b) => (a.onBeat + a.duration) % locationMgr.mod - (b.onBeat + b.duration) % locationMgr.mod)
//         // get the first position as starting position
//         const firstArrival = roleMovementsByArrival[0]
//         newInitialPositions.push([role, firstArrival.toX, firstArrival.toY])
//         // store all other positions for later lookup
//         manipulatorPositions.set(role, roleMovementsByArrival.map(anim => [(anim.onBeat + anim.duration) % locationMgr.mod, anim.toX, anim.toY]))
//     }

//     return [directMovementAnimations, new LocationMgr(
//         newInitialPositions,
//         locationMgr.mod,
//         locationMgr.movements,
//         locationMgr.basePatternRoles,
//         locationMgr.fullPatternRoles,
//         manipulatorPositions
//     )]
// }


// export function computePositionInFrontOf(locationMgr: LocationMgr, locationTime: number, roleTime: number, role: Role): [number, number, number] {
//     return computePositionBetween(locationMgr, locationTime, roleTime, {
//         type: "between",
//         between: [role, role],
//         side: 0.4,
//         offset: 0,
//         direction: 0
//     })
// }

// /** returns [x, y, absoluteRotationInDegree] (where rotation 0 = facing right) */
// /**
//  * resolves the location of a manipulator for a given action that is 
//  * abstracted as an AbstractPosition object that indicates the location
//  * relative to other roles.
//  * 
//  * @param layout known positions/animations so far
//  * @param abstractPosition specification of where to position the manipulator (relative)
//  * @param roleTime time at which the passer with a specified roleis identified
//  * @param locationTime time at which the location of a passer is identified (the passer may be identified by a role at an earlier time)
//  * @returns [x, y, absoluteRotationInDegree]
//  */
// export function computePositionBetween(locationMgr: LocationMgr, locationTime: number, roleTime: number, betweenSpec: BetweenPositionSpec): [number, number, number] {
//     // TODO maybe redo this to make it relative to a specific pass (i.e. handling crossing/straight,
//     //  which indication of whether to stand left/right of the pass and early/middle/late/very late)
//     // rather than specific numbers


//     const [toX, toY] = locationMgr.getFutureLocationByRole(locationTime, roleTime, betweenSpec.between[1])
//     // TODO for positioning relative to a self, for now we assume that the manipulator is facing
//     // the manipulated from the middle of the space, as if they were manipulating a pass comming
//     // from the point mirror position of the space.
//     const [fromX, fromY] = betweenSpec.between[0] !== betweenSpec.between[1] ?
//         locationMgr.getFutureLocationByRole(locationTime, roleTime, betweenSpec.between[0]) :
//         [1 - toX, 1 - toY]

//     const x = fromX + (toX - fromX) * (1 - betweenSpec.side)
//     const y = fromY + (toY - fromY) * (1 - betweenSpec.side)

//     const angle = Math.atan2(toY - fromY, toX - fromX)
//     const angleDegrees = angle * (180 / Math.PI)
//     const absoluteRotation = (angleDegrees + betweenSpec.direction) % 360

//     //  Compute perpendicular direction for the offset
//     const perpendicularAngle = angleDegrees + 90
//     const perpendicularRad = perpendicularAngle * (Math.PI / 180)
//     const offsetX = betweenSpec.offset * Math.cos(perpendicularRad)
//     const offsetY = betweenSpec.offset * Math.sin(perpendicularRad)

//     return [x + offsetX, y + offsetY, absoluteRotation]
// }