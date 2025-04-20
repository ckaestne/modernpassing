import { Application } from "https://deno.land/x/oak/mod.ts";
import { err } from "npm:typescript-parsec@~0.3.4";
import { GroupPattern } from "@modernpassing/pattern";
import { createGroupPattern } from "@modernpassing/parsing";
import { prettyPrintThrowsSvg } from "./debug-renderer-svg.ts";
import { renderGroupPattern } from "./renderer-svg.ts";
import { nextTick } from "node:process";

const app = new Application();


function page(p: string, svg: string, isValid: boolean, errors: string, isFourHanded: boolean, rendered: string, js: string): string {
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
                    <p>${svg}</p>
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
            const text = await Deno.readTextFile("../runtime/animations.js");
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
            let svg = ""
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
                svg = prettyPrintThrowsSvg(p)
                isValid = p.isValid();
                error = p.getValidationError()
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
            }
            ctx.response.body = page(pattern, svg, isValid, error, hands === 4, rendered, js);
        }
    }
    else next()
});

// Define the port
const port = 8000;

// Log that the server is starting
console.log(`Server is running on http://localhost:${port}`);

// Start the server and keep it running
await app.listen({ port });
