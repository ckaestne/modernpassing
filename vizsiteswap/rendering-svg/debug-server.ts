import { Application } from "https://deno.land/x/oak/mod.ts";
import { err } from "npm:typescript-parsec@~0.3.4";
import { GroupPattern } from "@modernpassing/pattern";
import { createGroupPattern } from "@modernpassing/parsing";
import { prettyPrintThrowsSvg } from "./debug-renderer-svg.ts";
import { renderGroupPattern } from "./renderer-svg.ts";
import { nextTick } from "node:process";
import { applyManipulations, fillPatternGaps } from "../manipulation/manipulator-processing.ts";
import { transpile } from "jsr:@deno/emit";
import * as path from "jsr:@std/path";

const app = new Application();


function page(p: string, svg1: string,svg2: string,svg3: string, isValid: boolean, errors: string, isFourHanded: boolean, rendered: string, js: string): string {
    return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Pattern</title>
                    <script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js"></script>
                    <script src="/animations.js"></script>
                </head>
                <body>
                    <h1>Siteswap Group Pattern:</h1>
                    <form method="POST">
                        <label for="content">Content:</label><br>
                        <textarea id="content" name="content" rows="10" cols="50">${p}</textarea><br><br>
                        <div>
                            <label>Pattern type:</label><br>
                            <input type="radio" id="sync" name="patternType" value="sync" ${!isFourHanded ? 'checked' : ''}>
                            <label for="sync">Synchronous</label>
                            <input type="radio" id="fourHanded" name="patternType" value="fourHanded" ${isFourHanded ? 'checked' : ''}>
                            <label for="fourHanded">Four-handed</label>
                        </div><br>
                        <button type="submit">Submit</button>
                    </form>
                    <p>${rendered}</p>
                    <script>window.addEventListener("load",function(){${js}\n})\n</script>
                    <hr/>
                    <h2>Plain:</h2>
                    <p>${svg1}</p>
                    <h2>Manipulator applied:</h2>
                    <p>${svg2}</p>
                    <h2>Filled:</h2>
                    <p>${svg3}</p>
                    <pre>${errors}</pre>
                    <pre>${js}</pre>
                </body>
            </html>
        `;
}

app.use(async (ctx, next) => {
    console.log(ctx.request.url.pathname)
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
            ctx.response.body = page("", "", true, "", false, "", "");
        } else if (ctx.request.method === "POST") {
            const formData: FormData = await ctx.request.body.formData();
            const pattern = formData.get("content")?.toString() || "";
            const hands = (formData.get("patternType")?.toString() || "sync") === "sync" ? 2 : 4;

            let error = ""
            let isValid = false
            let svgPlain = ""
            let svgManipulator = ""
            let svgFilled = ""
            let rendered = ""
            let js = ""
            try {
                const gp: GroupPattern = createGroupPattern(pattern, hands)
                const p = gp.pattern
                if (p.isValid()) {
                    const t = renderGroupPattern(gp, {})
                    rendered = t[0].svg()
                    js = t[1]
                }

           
                svgPlain = prettyPrintThrowsSvg(gp.aidenNotation![0])
                const rewritten =  applyManipulations(gp.aidenNotation![0], gp.aidenNotation![1])
                svgManipulator = prettyPrintThrowsSvg(rewritten)
                const filled =  fillPatternGaps(rewritten)
                svgFilled = prettyPrintThrowsSvg(filled)
                isValid = p.isValid();
                error = p.getValidationError()
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
                console.error("Error:", (e as Error).stack);
            }
            ctx.response.body = page(pattern, svgPlain, svgManipulator, svgFilled, isValid, error, hands === 4, rendered, js);
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
const source = await Deno.readTextFile(url.pathname);
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
