import { createSVGWindow } from 'svgdom'
import { SVG, registerWindow, Svg } from '@svgdotjs/svg.js'
import { FourHandedSiteswap } from './siteswap.js'
import { JSDOM } from 'jsdom'; // Import the JSDOM class




export interface Config {
    xDist: number;
    yDist: number;
    xMargin: number;
    yMargin: number;
    circleSize: number;
    startingHandsOffset: number;
    iterations: number;
    beyondMax: (n: number) => number;
    showExtraThrows: boolean;
    showCausalLines: boolean;
    showEarlyCausalLines: boolean;
    showLeftRight: boolean;
    showStraightCross: boolean;
    showStartingHands: boolean;
    throwCircleColor: string;
    throwExtraCircleColor: string;
    throwTextColor: string;
    throwTextSize: number;
    throwExtraTextColor: string;
    causalLineColor: string;
    causalLineWidth: number;
    causalLineDash: string;
    earlyCausalLineColor: string;
    extraCausalLineColor: string;
    labelTextColor: string;
    labelTextSize: number;
    startingHandsTextSize: number,
    startingJuggler: 0 | 1
}

export const defaultConfig: Config = {
    xDist: 32,
    yDist: 40,
    xMargin: 4,
    yMargin: 4,
    circleSize: 40,
    startingHandsOffset: 40,
    iterations: 2,
    beyondMax: (length) => length * 2 + 1,
    showExtraThrows: false,
    showCausalLines: false,
    showEarlyCausalLines: true,
    showLeftRight: true,
    showStraightCross: true,
    showStartingHands: true,
    throwCircleColor: "black",
    throwExtraCircleColor: "gray",
    throwTextColor: "white",
    throwTextSize: 28,
    throwExtraTextColor: "white",
    causalLineColor: "gray",
    causalLineWidth: 1,
    causalLineDash: "",
    earlyCausalLineColor: "lightgray",
    extraCausalLineColor: "gray",
    labelTextColor: "black",
    labelTextSize: 10,
    startingHandsTextSize: 16,
    startingJuggler: 0
};

export function siteswapToSvg(sw: FourHandedSiteswap, config?: Partial<Config>): Svg {
    if (!sw.isValid())
        throw new Error(`Invalid siteswap: ${sw.siteswapString()}`);


    const {
        xDist,
        yDist,
        xMargin,
        yMargin,
        circleSize,
        startingHandsOffset,
        iterations,
        beyondMax,
        showExtraThrows,
        showCausalLines,
        showEarlyCausalLines,
        showLeftRight,
        showStraightCross,
        showStartingHands,
        throwCircleColor,
        throwExtraCircleColor,
        throwTextColor,
        throwTextSize,
        throwExtraTextColor,
        causalLineColor,
        causalLineWidth,
        causalLineDash,
        earlyCausalLineColor,
        extraCausalLineColor,
        labelTextColor,
        labelTextSize,
        startingHandsTextSize,
        startingJuggler
    } = { ...defaultConfig, ...config }

    const hasLabel = showStraightCross || showLeftRight
    const labelMargin = hasLabel ? labelTextSize : 0
    const max = sw.length() * iterations;



    function xo(idx: number): number {
        return xMargin +
            (showStartingHands ? startingHandsOffset : 0) +
            circleSize / 2 + idx * xDist;
    }

    function yo(idx: number): number {
        return yMargin + (hasLabel ? labelMargin : 0) + circleSize / 2 +
            ((sw.jugglerAt(idx) + startingJuggler)%2) * yDist;
    }

    function yom(idx: number): number {
        return ((sw.throwOriginAt(idx) + startingJuggler)%2+1) * yDist;
    }

    const width = xMargin * 2 + circleSize +
        (showStartingHands ? startingHandsOffset : 0) +
        (sw.length() * iterations + (showExtraThrows ? beyondMax(sw.length()) - 0.8 : 0) - 1) * xDist
    const height = yMargin * 2 + (hasLabel ? labelMargin : 0) * 2 + circleSize + yDist


    // returns a window with a document and an svg root node
    const window = createSVGWindow()
    const document = window.document

    // register window and document
    registerWindow(window, document)
    // @ts-ignore
    const svg: Svg = SVG(document.documentElement)
    svg.size(width, height)
    // svg.rect("100%", "100%").fill("white").stroke("black")


    function causalLineFrom(svg: Svg, idx: number) {
        let color = causalLineColor
        if (idx < 0 || sw.causes(idx) < 0)
            color = earlyCausalLineColor
        if (idx > max)
            color = extraCausalLineColor

        if (sw.throwAt(idx) % 2 !== 0) {
            svg.line(xo(idx), yom(idx), xo(sw.causes(idx)), yo(sw.causes(idx))).
                stroke({ color: color, width: causalLineWidth, dasharray: causalLineDash })
        } else {
            const dir = sw.jugglerAt(idx) === 0 ? -1 : 1;
            const heffoffset = (() => {
                switch (sw.throwAt(idx)) {
                    case 2:
                        return yDist / 90 * 0;
                    case 6:
                        return yDist / 90 * 30;
                    case 8:
                        return yDist / 90 * 60;
                    case 10:
                        return yDist / 90 * 80;
                    default:
                        return 0;
                }
            })();
            svg.path(`M ${xo(idx)} ${yom(idx)} C ${xo(idx) + heffoffset} ${yo(idx) + dir * heffoffset}, ${xo(sw.causes(idx)) - heffoffset} ${yo(sw.causes(idx)) + dir * heffoffset}, ${xo(sw.causes(idx))} ${yo(sw.causes(idx))}`).
                stroke({ color: color, width: causalLineWidth, dasharray: causalLineDash }).fill("transparent")
        }
    }


    if (showCausalLines) {
        const maxIdx = max + (showExtraThrows ? beyondMax(sw.length()) : 0)
        for (let idx = showEarlyCausalLines ? -1 * sw.length() : 0; idx < maxIdx + 2; idx++)
            if ((showEarlyCausalLines || sw.causes(idx) >= 0) && (idx < maxIdx || sw.causes(idx) < maxIdx))
                causalLineFrom(svg, idx)
    }

    for (let idx = 0; idx < max + (showExtraThrows ? beyondMax(sw.length()) : 0); idx++) {
        svg.circle(circleSize).
            center(xo(idx), yo(idx)).
            fill(idx >= max ? throwExtraCircleColor : throwCircleColor)
        svg.text("").plain(sw.throwLetterAt(idx)).
            amove(xo(idx), yo(idx)).
            font({ size: throwTextSize, 'text-anchor': "middle", fill: idx >= max ? throwExtraTextColor : throwTextColor, 'dominant-baseline': "central", 'font-weight': "bold" })

        if (showLeftRight || (showStraightCross && sw.throwAt(idx) % 2 === 1)) {
            let text = []
            if (showLeftRight)
                text.push((idx+startingJuggler) % 4 < 2 ? "R" : "L")

            if ((showStraightCross && sw.throwAt(idx) % 2 === 1)) {
                text.push(getStraightCrossText((sw.jugglerAt(idx)+startingJuggler)%2, sw.throwAt(idx)))
            }

            const offset = (sw.jugglerAt(idx)+startingJuggler)%2 === 0 ? -circleSize / 2 : circleSize / 2;
            const baseline = (sw.jugglerAt(idx)+startingJuggler)%2 === 0 ? "text-after-edge" : "text-before-edge";

            svg.text("").plain(text.join(" ")).
                amove(xo(idx), yo(idx) + offset).
                addClass("throw-label").
                font({ size: labelTextSize, 'text-anchor': "middle", fill: labelTextColor, 'dominant-baseline': baseline })

        }

    }

    if (showStartingHands) {
        if (sw.isValidStart()) {
            for (const juggler of [0, 1]) {
                let startingHands = sw.getStartingHands(juggler % 2)
                if (juggler === 1 && startingJuggler===1) 
                    startingHands = [startingHands[1], startingHands[0]]
                svg.text("").plain(startingHands.join("|")).
                    amove(xMargin + startingHandsOffset / 2, yo(juggler)).
                    addClass("starting-hands").
                    font({ size: startingHandsTextSize, 'text-anchor': "middle", fill: labelTextColor, 'dominant-baseline': "central" })
            }
        } else { 
            svg.rect(startingHandsOffset, Math.abs(yo(1) - yo(0))).dx(xMargin).dy(Math.min(yo(0),yo(1))).fill("red");
        }
    }

    return svg
}


function getStraightCrossText(juggler: number, t: number): string {
    const p = (t - 1) / 2 % 2
    return (p ^ juggler) ? /*"∥"*/ "||" : "X";
}



export function replaceSiteswapElements(text: string, transform: (raw: string, siteswap: FourHandedSiteswap, config: Partial<Config>) => string): string {
    return text.replace(/<siteswap(.*?)>(.*?)<\/siteswap>/g, (match: string, config: string, siteswap: string) => {
        const sw = new FourHandedSiteswap(siteswap)
        if (!sw.isValid()) {
            console.error(`Invalid siteswap: ${siteswap}`);
            process.exit(1);
        }
        let c = {}
        if (config)
            try {
                const el = JSDOM.fragment(match);
                const configStr = el.firstElementChild?.getAttribute("style");
                if (configStr)
                    try {
                        c = JSON.parse(configStr);
                    } catch (e) {
                        console.error(`Invalid config: ${configStr}: ${e}`);
                        process.exit(1);
                    }

            } catch (e) {
                console.error(`Invalid html: ${match}, ${e}`);
                process.exit(1);
            }


        return transform(match, sw, c)
    });
}

