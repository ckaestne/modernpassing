

export interface RendererConfig {
    //basic layout
    xDist: number;
    yDist: number;
    xMargin: number;
    yMargin: number;
    throwCircleSize: number;
    throwCircleColor: string;
    throwTextColor: string;
    throwTextSize: number;

    //length / how many iterations of the pattern to show
    iterations: number;

    //starting hands display
    showStartingHands: boolean;
    startingHandsOffset: number;
    startingHandsTextSize: number,

    //annotations
    showLeftRight: boolean;
    showStraightCross: boolean;
    annotationTextColor: string;
    annotationTextSize: number;
    //TODO: show annotations above each row, not just above the top and below the bottom row (needed for more than two rows)

    //lines
    showLines: boolean;
    lineKind: "causal" | "ladder";
    selectLinesForThrows: undefined | number[]; // undefined = show lines for all throws
    lineColor: string;
    lineWidth: number;
    lineDash: string;
    lineBendOrientation: number[]; // one orientation for each passer, 0 = straight, -1 = bend top, 1 = bend bottom, can be scaled (e.g. 2=more bend)

    //emphasis
    emphasizeThrows: number[],
    emphasizeCircleColor: string,
    emphasizeTextColor: string,
    emphasizeLines: number[],
    emphasizeLineColor: string,
    emphasizeLineWith: number,
    emphasizeLineDash: string

    //show left and right hand in different rows, mostly for fully sync patterns
    separateleftRightRows: boolean
    yHandDist: number; // distance between left and right hand rows (if different from yDist)

    //passer roles
    showPasserRoles: boolean
    passerRolesOffset: number;
    passerRolesTextSize: number,    

    //layout and animation options
    renderLayoutOnly?: number; // default undefined/0; any other number (width/height of the layout) surpresses output of the actual pattern

    gallop: boolean, // right hand is 0.1 earlier and left hand 0.1 later
    useSimpleLabels: boolean // use s and p instead of 3 and 3p, etc.; adjusts automatically for gallop
    useAllSyncLabels: boolean // use in combination with useSimpleLabels
    showPassInLabel: boolean // show 3p instead of just 3; deactivated in simpleLabels
    showPassDestinationRole: boolean // us 3pA instead of 3p to indicate the destination; undefined is the default and means false for 2 passer pattern and true for more passers
}

export const defaultRendererConfig: RendererConfig = {
    xDist: 64,
    yDist: 40,
    yHandDist: 34,
    xMargin: 4,
    yMargin: 4,
    throwCircleSize: 40,
    startingHandsOffset: 40,
    iterations: 2,
    showLines: false,
    lineKind: "causal",
    lineBendOrientation: [-1, 1],
    showLeftRight: true,
    showStraightCross: true,
    showStartingHands: true,
    throwCircleColor: "black",
    throwTextColor: "white",
    throwTextSize: 28,
    lineColor: "gray",
    lineWidth: 1,
    lineDash: "",
    annotationTextColor: "black",
    annotationTextSize: 10,
    startingHandsTextSize: 16,
    emphasizeThrows: [],
    emphasizeCircleColor: "red",
    emphasizeTextColor: "white",
    emphasizeLines: [],
    emphasizeLineColor: "red",
    emphasizeLineWith: 3,
    emphasizeLineDash: "",
    selectLinesForThrows: undefined,
    separateleftRightRows: false,
    showPasserRoles: false,
    passerRolesOffset: 36,
    passerRolesTextSize: 28,
    renderLayoutOnly: undefined,

    gallop: false, 
    showPassInLabel: true,
    useSimpleLabels: true ,
    useAllSyncLabels: false,
    showPassDestinationRole: true,
};

export function customRendererConfigDefaults(nrHands: number, nrRows: number): RendererConfig {
    return {
        ... defaultRendererConfig,
        showPassInLabel: nrHands===2,
        useSimpleLabels: nrHands===2 ,
        showPassDestinationRole: nrRows > 2,
    }
}
