import { JSDOM } from 'jsdom';
import process from "node:process";


// deno-lint-ignore no-explicit-any
export function replaceElement( elementName:string, text: string, transform: (entireElement: string, innerText: string, styleConfig: any, videoLinks: string[]) => string): string {
    const re = new RegExp(`<${elementName}(.*?)>(.*?)</${elementName}>`, "gms");
    return text.replace(re, (match: string, config: string, inner: string) => {
        let c = {}
        const videoLinks: string[] = [];
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
                const attributes = el.firstElementChild?.attributes;
                if (attributes) {
                    for (let i = 0; i < attributes.length; i++) {
                        const attr = attributes[i];
                        if (attr.name.startsWith('video')) {
                            videoLinks.push(attr.value);
                        }
                    }
                }
            } catch (e) {
                console.error(`Invalid html: ${match}, ${e}`);
                process.exit(1);
            }


        try {
        return transform(match, inner, c, videoLinks)
        } catch (e) {
            console.error(`Error transforming element <${elementName}>${inner}</${elementName} / ${JSON.stringify(c)}>: ${e}`);
            throw e
        }
    });
}

