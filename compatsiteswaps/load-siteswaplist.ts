

import { JSDOM } from 'jsdom';



export type Config = {
    includeB: boolean,
    includeDragon: boolean,
    maxLength: number,
    url: string
}
export const defaultConfig: Config = {
    includeB: false,
    includeDragon: true,
    maxLength: 7,
    url: 'https://www.cs.cmu.edu/~ckaestne/siteswaps.xhtml'
}



export async function loadCompatSiteswapList(config: Config): Promise<Map<string, Map<number, Pattern[]>>> {
    const dom = await JSDOM.fromURL(config.url)

    // let swinterface: string = ""

    const patterns = dom.window.document.getElementById("patterns")!.querySelector("div")!
    let swinterface: string = ""
    const patternsByInterface: Map<string, Map<number, Pattern[]>> = new Map()
    for (let el of patterns.childNodes!) {
        if (el.nodeName === "h2") {
            swinterface = el.textContent!
            patternsByInterface.set(swinterface, new Map())
            // output += `\\paragraph{${el.textContent?.replaceAll("s", "x")}}\\\n\n`
        } else if (el.nodeName === "div" && (el as Element).classList.contains("p")) {
            const patternsByObjects: Map<number, Pattern[]> = patternsByInterface.get(swinterface)!
            for (const e of el.childNodes!) {
                const p = getPattern(e as Element, swinterface, config)
                if (p) {
                    if (!patternsByObjects.has(p.objects)) {
                        patternsByObjects.set(p.objects, []);
                    }
                    patternsByObjects.get(p.objects)!.push(p);
                }
            }

        }

    }

    return patternsByInterface

}

export type Pattern = {
    siteswap: string,
    objects: number,
    hasDragon: boolean,
    name: string | undefined,
    interface: string,
    link: string
}

function getPattern(node: Element, interf: string, config: Config): Pattern | undefined {
    if (node.nodeName !== "div") return undefined
    const a = node.querySelector("a")!
    const siteswap = a.innerHTML!
    const link = a.href
    const name = node.lastChild?.nodeName === "span" ? node.lastChild.textContent : undefined
    const hasDragon = node.classList.contains("dr")
    const objects = node.querySelector("span[class='num']")?.textContent

    if (hasDragon && !config.includeDragon) return undefined
    if (siteswap.includes('b') && !config.includeB) return undefined
    if (siteswap.length > config.maxLength) return undefined

    return { siteswap: siteswap, objects: parseFloat(objects!) * 2, hasDragon: hasDragon, name: name === "" || name === null ? undefined : name, interface: interf, link: link }
}


