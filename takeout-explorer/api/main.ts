import { Application, Router } from "@oak/oak";
import type { GroupPattern, RuntimeInitData } from "@modernpassing/layout";
import { createGroupPattern } from "@modernpassing/parsing";
import {
  applyManipulations,
  fillPatternGaps,
} from "@modernpassing/manipulation";
import { renderGroupPattern } from "@modernpassing/rendering-svg";
import {
  computeDebugPatternLayout,
  type DebugPatternLayout,
} from "./pattern-debug-layout.ts";

type RenderRequest = {
  content: string;
  patternType: "sync" | "fourHanded";
};

type RenderResult = {
  valid: boolean;
  error: string;
  plain: DebugPatternLayout | null;
  manipulator: DebugPatternLayout | null;
  filled: DebugPatternLayout | null;
  rendered: string;
  initData: RuntimeInitData;
};

function createEmptyRenderResult(error = ""): RenderResult {
  return {
    valid: false,
    error,
    plain: null,
    manipulator: null,
    filled: null,
    rendered: "",
    initData: {},
  };
}

function isRenderRequest(value: unknown): value is RenderRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.content === "string" &&
    (candidate.patternType === "sync" || candidate.patternType === "fourHanded")
  );
}

function renderPattern({ content, patternType }: RenderRequest): RenderResult {
  const hands = patternType === "fourHanded" ? 4 : 2;
  const result = createEmptyRenderResult();
  try {
    const gp: GroupPattern = createGroupPattern(content, hands);
    const p = gp.pattern;

    if (gp.aidanNotation && gp.aidanNotation[1].length > 0) {
      result.plain = computeDebugPatternLayout(gp.aidanNotation[0]);
      const rewritten = applyManipulations(
        gp.aidanNotation[0],
        gp.aidanNotation[1],
      );
      result.manipulator = computeDebugPatternLayout(rewritten);
      result.filled = computeDebugPatternLayout(fillPatternGaps(rewritten));
    } else {
      result.plain = computeDebugPatternLayout(p);
    }

    result.valid = p.isValid();
    if (result.valid) {
      const [svg, initData] = renderGroupPattern(gp, {});
      result.rendered = svg.svg();
      result.initData = initData;
    }
    result.error = p.getValidationError();
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    console.error(
      "Render error:",
      e instanceof Error ? e.stack ?? e.message : String(e),
    );
  }
  return result;
}

const router = new Router();

router.post("/api/render", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    if (!isRenderRequest(body)) {
      ctx.response.status = 400;
      ctx.response.body = createEmptyRenderResult(
        "Invalid request body. Expected { content: string, patternType: 'sync' | 'fourHanded' }.",
      );
      return;
    }
    ctx.response.body = renderPattern(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("/api/render request error:", message);
    ctx.response.status = 400;
    ctx.response.body = createEmptyRenderResult(message);
  }
  ctx.response.type = "application/json";
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// Serve the built React app from `dist/` in production. In dev, Vite handles
// this on port 3001 and proxies /api and /animations.js back here.
app.use(async (ctx, next) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/dist`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

const port = Number(Deno.env.get("PORT") ?? 8000);
console.log(`API server running on http://localhost:${port}`);
await app.listen({ port });
