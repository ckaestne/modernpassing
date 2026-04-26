import { Application } from "https://deno.land/x/oak/mod.ts";
import { err } from "npm:typescript-parsec@~0.3.4";
import type { GroupPattern } from "@modernpassing/layout";
import { createGroupPattern } from "@modernpassing/parsing";
import { prettyPrintThrowsSvg } from "./debug-renderer-svg.ts";
import { renderGroupPattern } from "./renderer-svg.ts";
import { nextTick } from "node:process";
import { applyManipulations, fillPatternGaps } from "../manipulation/manipulator-processing.ts";
import { transpile } from "jsr:@deno/emit";
import * as path from "jsr:@std/path";

const app = new Application();


function page(p: string, svg1: string,svg2: string,svg3: string, isValid: boolean, errors: string, isFourHanded: boolean, rendered: string, initDataJson: string): string {
    return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Pattern</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js"></script>
                    <script src="/animations.js"></script>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                            max-width: 1200px;
                            margin: 0 auto;
                            padding: 20px;
                            line-height: 1.6;
                            color: #212529;
                            background-color: #f1f3f4;
                        }
                        h1, h2 {
                            color: #1a202c;
                            border-bottom: 2px solid #2563eb;
                            padding-bottom: 10px;
                        }
                        form {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                            margin-bottom: 20px;
                            border: 1px solid #e2e8f0;
                        }
                        textarea {
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #cbd5e0;
                            border-radius: 4px;
                            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                            resize: vertical;
                            color: #2d3748;
                        }
                        textarea:focus {
                            outline: none;
                            border-color: #2563eb;
                            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                        }
                        .radio-group {
                            margin: 15px 0;
                            display: flex;
                            gap: 20px;
                        }
                        .radio-group input[type="radio"] {
                            margin-right: 5px;
                        }
                        .radio-group label {
                            color: #374151;
                            font-weight: 500;
                        }
                        button {
                            background: #2563eb;
                            color: white;
                            padding: 10px 20px;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 500;
                        }
                        button:hover {
                            background: #1d4ed8;
                        }
                        .section {
                            background: white;
                            margin: 20px 0;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                            border: 1px solid #e2e8f0;
                        }
                        pre {
                            background: #f8fafc;
                            padding: 15px;
                            border-radius: 4px;
                            overflow-x: auto;
                            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                            color: #2d3748;
                            border: 1px solid #e2e8f0;
                        }
                        hr {
                            border: none;
                            height: 2px;
                            background: linear-gradient(to right, #2563eb, transparent);
                            margin: 30px 0;
                        }
                    </style>
                </head>
                <body>
                    <h1>Siteswap Group Pattern</h1>
                    <form method="POST">
                        <label for="content">Content:</label><br>
                        <textarea id="content" name="content" rows="10" cols="50">${p}</textarea><br><br>
                        <div class="radio-group">
                            <label>Pattern type:</label><br>
                            <div>
                                <input type="radio" id="sync" name="patternType" value="sync" ${!isFourHanded ? 'checked' : ''}>
                                <label for="sync">Synchronous</label>
                            </div>
                            <div>
                                <input type="radio" id="fourHanded" name="patternType" value="fourHanded" ${isFourHanded ? 'checked' : ''}>
                                <label for="fourHanded">Four-handed</label>
                            </div>
                        </div>
                        <button type="submit">Submit</button>
                    </form>
                    
                    <div class="section">
                        ${rendered}
                    </div>
                    
                    <script>window.addEventListener("load",function(){initializeFromData(${initDataJson})\n})\n</script>
                    
                    <hr/>
                    
                    <div class="section">
                        <h2>Plain:</h2>
                        ${svg1}
                        <p>Notation: throw height, target role at throw, X/‖ for straight/crossing passes, row of receiver at causal, target hand (in first iteration), optional manipulator annotations (I, C, S); blue is right hand, green is left hand; arrow color indicates the hand at receiver</p>
                    </div>
                    
                    <div class="section">
                        <h2>Manipulator applied:</h2>
                        ${svg2}
                    </div>
                    
                    <div class="section">
                        <h2>Filled:</h2>
                        ${svg3}
                    </div>
                    
                    <div class="section">
                        <pre>${errors}</pre>
                        <pre>${initDataJson}</pre>
                    </div>
                </body>
            </html>
        `;
}

app.use(async (ctx, next) => {
    // console.log(ctx.request.url.pathname)
    if (ctx.request.url.pathname === "/animations.js") {
        try {
            const text = await Deno.readTextFile("dist/animations.js");
            ctx.response.body = text;
            ctx.response.type = "application/javascript";
        } catch (e) {
            ctx.response.status = 404;
            ctx.response.body = "File not found";
        }
        return;
    }

    await next();
});
app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === "/") {
        if (ctx.request.method === "GET") {
            ctx.response.body = page("", "","","", true, "", false, "", "");
        } else if (ctx.request.method === "POST") {
            const body = await ctx.request.body.form();
            const pattern = body.get("content") || "";
            const hands = (body.get("patternType") || "sync") === "sync" ? 2 : 4;

            let error = ""
            let isValid = false
            let svgPlain = ""
            let svgManipulator = ""
            let svgFilled = ""
            let rendered = ""
            let initDataJson = "{}"
            try {
                const gp: GroupPattern = createGroupPattern(pattern, hands)
                const p = gp.pattern
           
                if (gp.aidanNotation && gp.aidanNotation[1].length > 0) {
                    svgPlain = prettyPrintThrowsSvg(gp.aidanNotation![0])
                    const rewritten =  applyManipulations(gp.aidanNotation![0], gp.aidanNotation![1])
                    svgManipulator = prettyPrintThrowsSvg(rewritten)
                    const filled =  fillPatternGaps(rewritten)
                    svgFilled = prettyPrintThrowsSvg(filled)
                } else {
                    svgPlain = prettyPrintThrowsSvg(p);
                }
                isValid = p.isValid();
                if (p.isValid()) {
                    const [svg, initData] = renderGroupPattern(gp, {})
                    rendered = svg.svg()
                    initDataJson = JSON.stringify(initData)
                }
                error = p.prettyPrintThrows(false)
                error = p.getValidationError()
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
                console.error("Error:", (e as Error).stack);
            }
            ctx.response.body = page(pattern, svgPlain, svgManipulator, svgFilled, isValid, error, hands === 4, rendered, initDataJson);
        }
    }
    else next()
});

 
// console.log("Updating runtime.js")
// const js_path = path.join("..","runtime");
// const url = new URL("../runtime/animations.ts", import.meta.url);
// const result = await transpile(url);
// const code = await result.get(url.href);
// await Deno.mkdir(js_path, { mode: 0o775, recursive: true });
// Deno.writeTextFile("../dist/animations.js", "// GENERATED CODE. DO NOT MODIFY //\n" + code!);
const url = new URL("../runtime/animations.ts", import.meta.url);
const source = await Deno.readTextFile(url);
const sourceWithoutImports = source.replace(/^import.*$/gm, '')//.replace(/^\s*$/gm, '').replace(/^\n+/g, '');
const u = new URL(`data:text/typescript,${encodeURIComponent(sourceWithoutImports)}`)
const result = await transpile(u);
const code = await result.get(u.href)?.replaceAll("export","");
Deno.writeTextFile("dist/animations.js", "// GENERATED CODE. DO NOT MODIFY //\n" + code!);

// Define the port
const port = 8000;

// Log that the server is starting
console.log(`Server is running on http://localhost:${port}`);

// Start the server and keep it running
await app.listen({ port });
