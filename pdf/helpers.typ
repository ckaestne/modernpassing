
// Helpers and re-exports used by both template.typ and generated chapter files.
//
// Why this file exists: Typst's `#include` does NOT import `#let` bindings
// from the including file into the included module's scope. So any function
// or symbol that generated chapter content calls directly (e.g. `toprule()`)
// must be importable from a shared module. Generated chapters import this
// file unconditionally; template.typ also imports from it so the symbols are
// defined in exactly one place.


#let defaultFontSize = 9pt
#let smallFontSize = 8pt


#import "@preview/booktabs:0.0.4": toprule, midrule, bottomrule
#import "@preview/zebra:0.1.0": qrcode

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

// Reference a chapter/section by its anchor label, rendering just the bare
// section number as a clickable link. We can't use `#ref`/`@` here because the
// heading numbering is `unary` (`str(last) + "."`), so a normal reference would
// carry a trailing period (e.g. "5."). Format the counter directly instead.
#let secref(lbl) = link(lbl, context numbering("1", counter(heading).at(lbl).last()))

// Side-aligned figure (no text wrap). Width is set on the image itself by
// the markdown -> typst converter via `<!-- typ-figure: right width: ... -->`.
#let right_figure(body) = align(right, body)
#let left_figure(body) = align(left, body)

// QR code with a label next to it, vertically centered. `size` controls the
// width/height of the QR code; `label` is arbitrary content shown on the right.
#let qr_with_label(data, label, size: 1cm, gutter: 0.6em) = grid(
  columns: (size, auto),
  column-gutter: gutter,
  align: horizon,
  qrcode(data, width: size),
  label,
)

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
  #text(size: smallFontSize)[#body]
]