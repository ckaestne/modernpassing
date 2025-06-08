import { transpile } from "jsr:@deno/emit";

console.log("Updating runtime.js")
const url = new URL("animations.ts", import.meta.url);
const source = await Deno.readTextFile(url.pathname);
const sourceWithoutImports = source.replace(/^import.*$/gm, '')//.replace(/^\s*$/gm, '').replace(/^\n+/g, '');
const u = new URL(`data:text/typescript,${encodeURIComponent(sourceWithoutImports)}`)
const result = await transpile(u);
const code = await result.get(u.href)?.replaceAll("export","");
// await Deno.mkdir(js_path, { mode: 0o775, recursive: true });
Deno.writeTextFile("../dist/animations.js", "// GENERATED CODE. DO NOT MODIFY //\n" + code!);
console.log(code)



