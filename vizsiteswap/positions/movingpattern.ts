export type Pattern = {
    initialJugglerPositionsOnCircle: number[]
    walking: (string | null)[]
    walkPositionChange: number[] // position change per beat after walking triggered

    jugglerLabels: string[] // ['A', 'B', 'C', 'M']
    manipulatorIds: string[]// ['M'] // subset of jugglerLabels
    swapManipulator: [number, string, string][]
    manipulatorPositions: Map<string, string[][]>
    relabel: Map<string, string>
    passes: [string, string][][]
}

//distinct jugglers are identified by index (associated with a color); their labels and positions change all the time
export type State = {
    prior: State | null,
    positionsOnCircle: number[], // for each juggler, manipulator's values don't matter and are computed from other positions; updated through walking or swapping with manipulator
    labels: string[], // for each juggler on this beat
    passes: [string, string][], // passes on this beat
    beat: number // total counter for beats
}


export function nextState(state: State, pattern: Pattern): State {
    const newLabels = state.labels.slice()
    const newPositionsOnCircle = state.positionsOnCircle.slice()
    const newBeat = state.beat + 1
    const newBeatIdx = newBeat % pattern.passes.length


    let oldWalkingState: State | null = state
    for (let beatLookbackForWalking = 1; beatLookbackForWalking <= pattern.walkPositionChange.length && oldWalkingState; beatLookbackForWalking++) {
        const whoWasWalking = pattern.walking[oldWalkingState.beat % pattern.passes.length]
        // console.log(`beat ${newBeat} beatLookbackForWalking: ${beatLookbackForWalking} ${whoWasWalking}`)
        if (whoWasWalking !== null) {
            const whoWasWalkingJugglerIdx = oldWalkingState.labels.indexOf(whoWasWalking)
            const from = state.positionsOnCircle[whoWasWalkingJugglerIdx]
            // console.log(whoWasWalkingJugglerIdx, pattern.walkPositionChange[beatLookbackForWalking-1])
            const to = (from + pattern.walkPositionChange[beatLookbackForWalking-1]) % 360
            newPositionsOnCircle[whoWasWalkingJugglerIdx] = to
            // console.log(state.positionsOnCircle, newPositionsOnCircle)
        }
        oldWalkingState = oldWalkingState.prior
    }


    // check manipulator relabel; happens on the beat after the intercept
    for (let [b/*beat*/, m, p] of pattern.swapManipulator) {
        if (newBeatIdx === (b + 1) % pattern.passes.length && state.prior) {
            const p1idx = state.prior.labels.indexOf(m)
            const p2idx = state.prior.labels.indexOf(p)
            newLabels[p1idx] = p
            newLabels[p2idx] = m

            newPositionsOnCircle[p1idx] = newPositionsOnCircle[p2idx]
        }
    }

    // add end of pattern do big relabel
    if (newBeatIdx === 0)
        for (let idx = 0; idx < pattern.jugglerLabels.length; idx++) {
            newLabels[idx] = pattern.relabel.get(newLabels[idx])!
        }




    return {
        prior: state,
        positionsOnCircle: newPositionsOnCircle,
        labels: newLabels,
        passes: pattern.passes[newBeat % pattern.passes.length],
        beat: newBeat
    }
}
