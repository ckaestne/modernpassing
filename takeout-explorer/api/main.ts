import { Application, Router } from "@oak/oak"
import { transpile } from "@deno/emit"
import type { GroupPattern } from "@modernpassing/layout"
import { createGroupPattern } from "@modernpassing/parsing"
import { applyManipulations, fillPatternGaps } from "@modernpassing/manipulation"
import { renderGroupPattern } from "@modernpassing/rendering-svg"
import {
    computeDebugPatternLayout,
    type DebugPatternLayout,
} from "./pattern-debug-layout.ts"

type RenderRequest = {
    content: string
    patternType: "sync" | "fourHanded"
}

type RenderResult = {
    valid: boolean
    error: string
    plain: DebugPatternLayout | null
    manipulator: DebugPatternLayout | null
    filled: DebugPatternLayout | null
    rendered: string
    js: string
}

function renderPattern({ content, patternType }: RenderRequest): RenderResult {
    const hands = patternType === "fourHanded" ? 4 : 2
    const result: RenderResult = {
        valid: false,
        error: "",
        plain: null,
        manipulator: null,
        filled: null,
        rendered: "",
        js: "",
    }
    try {
        const gp: GroupPattern = createGroupPattern(content, hands)
        const p = gp.pattern

        if (gp.aidanNotation && gp.aidanNotation[1].length > 0) {
            result.plain = computeDebugPatternLayout(gp.aidanNotation[0])
            const rewritten = applyManipulations(
                gp.aidanNotation[0],
                gp.aidanNotation[1],
            )
            result.manipulator = computeDebugPatternLayout(rewritten)
            result.filled = computeDebugPatternLayout(fillPatternGaps(rewritten))
        } else {
            result.plain = computeDebugPatternLayout(p)
        }

        result.valid = p.isValid()
        if (result.valid) {
            const [svg, js] = renderGroupPattern(gp, {})
            result.rendered = svg.svg()
            result.js = js
        }
        result.error = p.getValidationError()
    } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        console.error("Render error:", (e as Error).stack)
    }
    return result
}

// Generate animations.js once at startup by transpiling runtime/animations.ts.
async function buildAnimationsJs(): Promise<string> {
    const url = new URL(
        "../../vizsiteswap/runtime/animations.ts",
        import.meta.url,
    )
    const source = await Deno.readTextFile(url)
    const sourceWithoutImports = source.replace(/^import.*$/gm, "")
    const u = new URL(
        `data:text/typescript,${encodeURIComponent(sourceWithoutImports)}`,
    )
    const result = await transpile(u)
    const code = result.get(u.href)?.replaceAll("export", "") ?? ""
    return "// GENERATED CODE. DO NOT MODIFY //\n" + code
}

const animationsJs = await buildAnimationsJs()

const router = new Router()

router.post("/api/render", async (ctx) => {
    const body = (await ctx.request.body.json()) as RenderRequest
    ctx.response.body = renderPattern(body)
    ctx.response.type = "application/json"
})

router.get("/animations.js", (ctx) => {
    ctx.response.body = animationsJs
    ctx.response.type = "application/javascript"
})

const app = new Application()
app.use(router.routes())
app.use(router.allowedMethods())

// Serve the built React app from `dist/` in production. In dev, Vite handles
// this on port 3000 and proxies /api and /animations.js back here.
app.use(async (ctx, next) => {
    try {
        await ctx.send({
            root: `${Deno.cwd()}/dist`,
            index: "index.html",
        })
    } catch {
        await next()
    }
})

const port = Number(Deno.env.get("PORT") ?? 8000)
console.log(`API server running on http://localhost:${port}`)
await app.listen({ port })
