/**
 * takes an animation spec and produces an animation plan
 * 
 * that is, translate relative role-based positions and actions
 * into specific passer-based coordinates that can be executed
 * with little computation in the frontend.
 */

import type { Hand, Role } from "../pattern/pattern.ts";
import type { AnimationPlan, MovementAnimation, PassAnimation, RelabelAnimation } from "./animation-plan.ts";
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
export function createAnimationPlan(animationSpec: AnimationSpec, canvasSizeByPasserCircle: number): AnimationPlan {
    // all roles, this is used to create ids
    const roles = animationSpec.initialPositions.map(pos => pos.role)
    function passerId(role: Role): number { return roles.indexOf(role) }

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
            const [fromX, fromY] = locationMgr.getLocationByRole(time, passSpec.pass.fromRole)
            // get location for the "to" position, at the beat that the pass arrives (role may have changed, we use the role at the time the pass is thrown to identify the target passer)
            // for zaps (pelfs in takeouts), we use the location where the passer starts, not the location where they will be when the arrow is no longer shown
            const passArrivalTime = passSpec.throwLength <= 2 ? time : time + passSpec.displayDuration
            const toRoleAtThrow = passSpec.pass.toRole
            const [toX, toY] = locationMgr.getFutureLocationByRole(passArrivalTime % locationMgr.mod, time, toRoleAtThrow)

            if (passSpec.onBeat === 3 && passSpec.pass.toRole === "M") {
                console.log("debug-pass", { time, passArrivalTime, from: [fromX, fromY], to: [toX, toY] })
            }

            // in the first iteration, a walking passer might start in the wrong space, we need to handle this separately
            // TODO for now let's just assume the passer is not also walking immediately on beat 0 and is not walking longer to deal with passes on other beats
            let firstIteration = undefined
            if (time == 0) {
                const [, initialX, initialY,] = locationMgr.getInitialPositions().find(i => i[3] === passSpec.pass.toRole)!
                if (Math.abs(initialX - toX) > 0.001 || Math.abs(initialY - toY) > 0.001) {
                    firstIteration = false
                    const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
                        computePass(fromX, fromY, passSpec.pass.fromHand, initialX, initialY, passSpec.pass.toHand, relativeArmLength, 0.01)
                    result.push({
                        onBeat: time,
                        duration: passSpec.displayDuration,
                        firstIteration: true,

                        fromX: fromHandX,
                        toX: toHandX,
                        fromY: fromHandY,
                        toY: toHandY,
                        labelX: labelHandX,
                        labelY: labelHandY,
                        label: passSpec.pass.label,
                        debug_center: {
                            fromX: fromX,
                            fromY: fromY,
                            toX: initialX,
                            toY: initialY,
                        }
                    })
                }
            }

            const [fromHandX, fromHandY, toHandX, toHandY, labelHandX, labelHandY] =
                computePass(fromX, fromY, passSpec.pass.fromHand, toX, toY, passSpec.pass.toHand, relativeArmLength, 0.01)
            result.push({
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
                }
            })
        }
        return result
    }

}



function convertRelabeling(locationMgr: LocationManager, relabelingSpecs: RelabelSpec): RelabelAnimation[] {
    const result: RelabelAnimation[] = [];
    for (let time = 0; time < locationMgr.mod; time++) {
        for (const relabel of relabelingSpecs.relabelActions) {
            if (time % relabel.mod === Math.floor(relabel.onBeat)) {
                const changes: [PasserIdx, Role][] = relabel.changes.map(([fromRole, toRole]) => {
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

