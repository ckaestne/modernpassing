// Helpers and re-exports used by both template.typ and generated chapter files.
//
// Why this file exists: Typst's `#include` does NOT import `#let` bindings
// from the including file into the included module's scope. So any function
// or symbol that generated chapter content calls directly (e.g. `toprule()`)
// must be importable from a shared module. Generated chapters import this
// file unconditionally; template.typ also imports from it so the symbols are
// defined in exactly one place.

#import "@preview/booktabs:0.0.4": toprule, midrule, bottomrule

#let figure_scale = (
  plain: 100%,
  siteswap: 40%,
  sync: 40%,
  sync-group: 40%,
  siteswap-group: 40%,
)

#let fit_to_available(body, factor: 1.0) = layout(size => {
  let scaled = scale(x: factor, y: factor, reflow: true, body)
  let scaled_width = measure(scaled).width

  if scaled_width > size.width {
    let downscale = size.width / scaled_width * 100%
    scale(x: downscale, y: downscale, reflow: true, scaled)
  } else {
    scaled
  }
})

#let scale_figure_images(it, factor) = {
  show image: img => fit_to_available(img, factor: factor)
  it
}

// Side-aligned figure (no text wrap). Width is set on the image itself by
// the markdown -> typst converter via `<!-- typ-figure: right width: ... -->`.
#let right_figure(body) = align(right, body)
#let left_figure(body) = align(left, body)

#let progression(body) = [
  #show " —": ":"
  #set text(style: "italic")
  #let seen_item = state("progression-seen-item", false)
  #seen_item.update(false)

  #show strong: it => context {
    let prefix = if seen_item.get() { [#h(0.5em)|#h(0.5em)] } 
    seen_item.update(true)
    [#prefix#it]
  }

  #show parbreak: none
  #text(size: 7pt)[#body]
]