

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
}

export const defaultRendererConfig: RendererConfig = {
    xDist: 32,
    yDist: 40,
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
    selectLinesForThrows: undefined
};