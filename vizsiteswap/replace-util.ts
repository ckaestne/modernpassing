import { JSDOM } from 'jsdom';
import { FourHandedSiteswap } from './siteswap.js';

export function replaceSiteswapElements(text: string, transform: (raw: string, siteswap: FourHandedSiteswap, config: any) => string): string {
    return replaceElement("siteswap", text, (match, inner, config) => {
        const sw = new FourHandedSiteswap(inner)
        if (!sw.isValid()) {
            console.error(`Invalid siteswap: ${inner}`);
            process.exit(1);
        }
        return transform(match, sw, config)
    })
}


export function replaceElement( elementName:string, text: string, transform: (entireElement: string, innerText: string, styleConfig: any) => string): string {
    const re = new RegExp(`<${elementName}(.*?)>(.*?)</${elementName}>`, "g");
    return text.replace(re, (match: string, config: string, inner: string) => {
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


        return transform(match, inner, c)
    });
}

