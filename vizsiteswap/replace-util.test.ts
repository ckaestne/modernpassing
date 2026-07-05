import { assertEquals } from "jsr:@std/assert"
import { replaceElement } from "./replace-util.ts"

Deno.test("replaceElement transforms elements outside comments", () => {
    const result = replaceElement("video", "before <video>url</video> after", (_m, inner) => `[${inner}]`)
    assertEquals(result, "before [url] after")
})

Deno.test("replaceElement leaves elements inside HTML comments untouched", () => {
    const input = '<!-- <a href="x"><video controls><source src="y" /></video></a> -->'
    const result = replaceElement("video", input, (_m, inner) => `[${inner}]`)
    assertEquals(result, input)
})

Deno.test("replaceElement transforms outside a comment but not inside it", () => {
    const input = "<!-- <video>old</video> -->\n<video>new</video>"
    const result = replaceElement("video", input, (_m, inner) => `[${inner}]`)
    assertEquals(result, "<!-- <video>old</video> -->\n[new]")
})
