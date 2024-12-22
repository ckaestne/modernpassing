import { JSDOM } from 'jsdom';
import process from "node:process";


// deno-lint-ignore no-explicit-any
export function replaceElement( elementName:string, text: string, transform: (entireElement: string, innerText: string, styleConfig: any) => string): string {
    const re = new RegExp(`<${elementName}(.*?)>(.*?)</${elementName}>`, "gms");
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

