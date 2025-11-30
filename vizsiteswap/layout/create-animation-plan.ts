/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import type { Hand, Role } from "../pattern/pattern.ts";
import { apFindPosition, apGetRole, type AnimationPlan, type MovementAnimation, type PassAnimation, type RelabelAnimation } from "./animation-plan.ts";
import type { AnimationSpec, PassSpec, RelabelSpec } from "./animation-spec.ts";
import type { LocationManager } from "./location-manager/location-manager.ts";
import type { PasserIdx } from "./location-manager/helpers.ts";
import { createFullLocationManager } from "./location-manager/location-manager.ts";



/**
 * creates the animation plan
 * @param animationSpec 
 * @param canvasSizeByPasserCircle Size of the canvas relative to the size of a circle representing a passer
 *      for example, a 200px canvas with a passer circle of 20px would be 10.
 *      While all animations are rendered on relative locations from 0 to 1, this is needed to scale animations to the circle size, especially the length of arms for passes
 * @returns 
 */
export function createAnimationPlan(animationSpec: AnimationSpec, canvasSizeByPasserCircle: number = 200 / 40): AnimationPlan {
    // all roles, this is used to create ids
    const locationMgr = createFullLocationManager(animationSpec);



    // relative movements add manipulator movements; creating animations and also adding computed manipulator positions to the location manager
    const movementAnimations: MovementAnimation[] = locationMgr.getAnimations();

    const passAnimations: PassAnimation[] = animationSpec.passAnimations.flatMap(convertPassAnimation(locationMgr, canvasSizeByPasserCircle))
    const relabeling: RelabelAnimation[] = convertRelabeling(locationMgr, animationSpec.relabeling)

    // initial positions is trivial
    const initialPositions = locationMgr.getInitialPositions().map(([_passerIdx, x, y, initialRole]) => ({
        x,
        y,
        initialRole
    }))

    return {
        mod: locationMgr.mod,
        initialPositions,
        passAnimations,
        movementAnimations,
        relabeling
    }

}

function convertPassAnimation(locationMgr: LocationManager, canvasSizeByPasserCircle: number): (passSpec: PassSpec) => PassAnimation[] {
    const relativeArmLength = 1 / canvasSizeByPasserCircle * .9
    return (passSpec: PassSpec): PassAnimation[] => {

        const result: PassAnimation[] = []
        for (let time = passSpec.onBeat; time < locationMgr.mod; time += passSpec.mod) {
            // getting locations for first and second iteration, in case they are different

            const [fromX, fromY] = locationMgr.getLocationByRole(time, passSpec.pass.fromRole)
            const [fromX2, fromY2] = locationMgr.getLocationByRole(time + locationMgr.mod, passSpec.pass.fromRole)
            // get location for the "to" position, at the beat that the pass arrives (role may have changed, we use the role at the time the pass is thrown to identify the target passer)
            // for zaps (pelfs in takeouts), we use the location where the passer starts, not the location where they will be when the arrow is no longer shown
            const passArrivalTime = passSpec.throwLength <= 2 ? time : time + passSpec.displayDuration
            const toRoleAtThrow = passSpec.pass.toRole
            const [toX, toY] = locationMgr.getFutureLocationByRole(passArrivalTime, time, toRoleAtThrow)
            const [toX2, toY2] = locationMgr.getFutureLocationByRole(passArrivalTime + locationMgr.mod, time + locationMgr.mod, toRoleAtThrow)


            if (fromX !== fromX2 || fromY !== fromY2 || toX !== toX2 || toY !== toY2) {
                result.push(createPassAnimationInstance(fromX, fromY, toX, toY, passSpec, time, relativeArmLength, true))
                result.push(createPassAnimationInstance(fromX2, fromY2, toX2, toY2, passSpec, time, relativeArmLength, false))
            }
            else
                result.push(createPassAnimationInstance(fromX, fromY, toX, toY, passSpec, time, relativeArmLength, undefined))

        }
        return result
    }

}



function convertRelabeling(locationMgr: LocationManager, relabelingSpecs: RelabelSpec): RelabelAnimation[] {
    const result: RelabelAnimation[] = [];
    for (let time = 0; time < locationMgr.mod; time++) {
        for (const relabel of relabelingSpecs.relabelActions) {
            if (time % relabel.mod === Math.floor(relabel.onBeat)) {
                const changes: [PasserIdx, Role][] = relabel.changes.map(([_fromRole, toRole]) => {
                    return [locationMgr.roleTracker._getPasserIdx(time, toRole), toRole];
                });
                result.push({ onBeat: time, changes })
            }
        }
    }
    return result;
}




/** from animations.ts */

/**
 *     const [fromX, fromY, toX, toY, labelX, labelY] = computePass(x1, y1, fromHand, x2, y2, toHand)
 * @param x1 
 * @param y1 
 * @param hand1 
 * @param x2 
 * @param y2 
 * @param hand2 
 * @param armLength 
 * @param labelDistance 
 * @returns 
 */
function computePass(x1: number, y1: number, hand1: Hand, x2: number, y2: number, hand2: Hand, armLength: number, labelDistance: number): [number, number, number, number, number, number] {
    //angle between the two points
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
    //move 20 pixel 45 degree from that angle from the first point
    const armAngle = 40 //todo make this configurable
    const throwOutside = 1

    const direction1 = hand1 === 0 ? armAngle : -armAngle
    const x3 = x1 + armLength * Math.cos((angle + direction1) * Math.PI / 180)
    const y3 = y1 + armLength * Math.sin((angle + direction1) * Math.PI / 180)

    const direction2 = hand2 === 0 ? armAngle * throwOutside : -armAngle * throwOutside
    const x4 = x2 + armLength * Math.cos((180 + angle + direction2) * Math.PI / 180)
    const y4 = y2 + armLength * Math.sin((180 + angle + direction2) * Math.PI / 180)

    const length = Math.sqrt((x3 - x4) ** 2 + (y3 - y4) ** 2)

    let labelX = (x3 + x4) / 2
    let labelY = (y3 + y4) / 2

    const passAngle = Math.atan2(y4 - y3, x4 - x3) * 180 / Math.PI

    const labelAngle =
        hand1 === 0 && hand2 === 1 ? 90 : // right hand pass to the right
            hand1 === 1 && hand2 === 0 ? 90 : // left hand pass to the left
                hand1 === 0 && hand2 === 0 ? -90 :
                    90 // crossing pass toward the target

    //sideways adjustment for label
    // if (labelAngle !== 0) {
    labelX += labelDistance * Math.cos((angle + labelAngle) * Math.PI / 180)
    labelY += labelDistance * Math.sin((angle + labelAngle) * Math.PI / 180)
    // }
    //forward adjustment for label
    labelX += length / 4 * Math.cos(passAngle * Math.PI / 180)
    labelY += length / 4 * Math.sin(passAngle * Math.PI / 180)


    return [x3, y3, x4, y4, labelX, labelY]
}


function createPassAnimationInstance(fromX: number, fromY: number, toX: number, toY: number, passSpec: PassSpec, time: number, relativeArmLength: number, firstIteration: boolean | undefined): PassAnimation {

    const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
        computePass(fromX, fromY, passSpec.pass.fromHand, toX, toY, passSpec.pass.toHand, relativeArmLength, 0.01)
    return {
        onBeat: time,
        duration: passSpec.displayDuration,
        firstIteration,

        fromX: fromHandX,
        toX: toHandX,
        fromY: fromHandY,
        toY: toHandY,
        labelX: labelHandX,
        labelY: labelHandY,
        label: passSpec.pass.label,
        debug_center: {
            fromX,
            toX,
            fromY,
            toY
        },
    }
}






/** infrastructure for compatibility with old tests for convenient operation on AnimationPlans */



class AnimationPlanMgr {
    constructor(public plan: AnimationPlan) { }


    // inefficient implementation, use for testing/debugging only
    getLocationByRole(time: number, role: string): [number, number] {
        for (let passerIdx = 0; passerIdx < this.plan.initialPositions.length; passerIdx++) {
            if (apGetRole(this.plan, passerIdx, time) === role) {
                return apFindPosition(this.plan, passerIdx, time)
            }
        }
        throw new Error(`Role ${role} not found at time ${time}`)
    }
}

export function computeBaseAnimations(animationSpec: AnimationSpec, canvasSizeByPasserCircle: number = 200 / 40): AnimationPlanMgr {
    const plan = createAnimationPlan(animationSpec, canvasSizeByPasserCircle);
    return new AnimationPlanMgr(plan)
}