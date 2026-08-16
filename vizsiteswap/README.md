# vizsiteswap

TypeScript/Deno library for parsing, validating, and rendering club passing patterns (siteswaps, synchronous patterns, and takeout patterns) as SVG diagrams and browser animations. It creates the figures and animations in the [Modern Club Passing](https://modernpassing.com) book and the [Takeout Explorer](https://takeout-explorer.modernpassing.deno.net).

Patterns are written in compact notation, e.g.

```
<siteswap>7746666</siteswap>
```

or

```
<sync-group>
A: 3pB 3 3pC 3 3pB 3 -- B
B: 3pA 3 3   3 3pA 3 -- C
C: 3   3 3pA 3 3   3 -- A
M: CB↺ . SBl z ICl↺ 
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>
```

From there, a pattern is parsed and analyzed. Patterns can be validated, starts can be computed, and so forth. For manipulator patterns, manipulator instructions can be translated into actual actions. For movement, positions of passers can be tracked.

Finally, all of this can be rendered as SVG files and SVG animations.

## Modules

Deno workspace; each module has its own `deno.json` and tests:

- **parsing/** — parses siteswap, sync, and group notation into patterns
- **pattern/** — core representation of throws, hands, passers, and roles
- **layout/** — computes positions and movement for animations (role-based specs → concrete per-passer plans)
- **manipulation/** — manipulator/takeout layout and animation, translates manipulator instructions into local actions
- **rendering-core/** — abstract rendering interfaces
- **rendering-svg/** — SVG diagrams and web animations
- **rendering-tikz/** — TikZ output (obsolete, not maintained)
- **runtime/** — runtime code for animations in the browser, compiled to JavaScript
- **svg-utils/** — SVG helpers

`mdbook-siteswapsvg.ts` is the mdBook preprocessor that turns `<siteswap>`, `<sync>`, `<siteswap-group>`, and `<sync-group>` tags in the book source into inline SVG and animation code.

## Design notes

### Pattern

`Pattern` is the core abstraction of a pattern after parsing.
This is what gets analyzed (e.g., for validation), rendered,
and modified (e.g., when applying manipulators).

A pattern primarily consists of a bunch of throws, where each throw
has a throw beat, a length, and an origin (passer and hand) and a destination (passer and hand).
* The pattern always wraps around, so a throw of length 3 on beat 5 of a 6-beat pattern lands on beat 2. Time is continuous (including negative numbers) whereas a beat corresponds to a specific point within one iteration of the pattern.
* Origin and destination of throws are identified by individual passers, not by roles. Passers are identified by `rowIdx` ids in the pattern. For patterns where rows are relabeled (`mapRows`), this representation can be unintuitive because a self might point to a different row if it wraps around the end of the pattern. Various helper functions like `samePasserNBeatsLater` help to navigate that.
* Roles ("A", "B", "M") are tracked as labels for each passer on each beat, but they have no internal meaning for the pattern and its validity. Roles are used for presentation (including animations), and movement and manipulator instructions (outside of `Pattern`) are expressed in terms of roles. There are various helper functions to look up who had which role at what time.
* Handedness is somewhat complicated due to wrapping: each beat has a default hand where we would expect a throw, encoded in the pattern as `globalHandOrder` (right–left for alternating patterns or right–right–left–left for 4-handed siteswaps). A throw records only deviations from this default: `fromOppositeHand` marks a throw from the other hand, and `flipCrossing` makes a throw land in the opposite hand of the expected one. A pattern can have two throws from the same passer on the same beat if they have different `fromOppositeHand` values. The default hand of the first beat may change if the pattern length is not a multiple of the length of the `globalHandOrder` sequence (e.g., three count encoded with 3 beats); this is done by shifting the `globalHandOrder` for each iteration accordingly. Various helper functions help to look up the source and target hands for throws.
* Validation logic ensures that no two throws arrive at the same hand at the same time or are thrown from the same hand at the same time, and that causal arrows form a continuous path.
* Manipulators and movement are not represented as part of the pattern. Manipulator instructions are tracked separately, but a key functionality is to translate manipulator instructions and a pattern into a new pattern where the manipulator is another row and all their actions are resolved as normal throws in `Pattern`. The pattern's throws can, however, carry optional markers that provide information about whether throws originated from manipulator actions or correspond to intercepts etc. Generally, there is often a traditional representation of a manipulator pattern (pattern + manipulator instructions) in addition to the generated "local" version of the pattern. Movement is also tracked externally by the layout manager.

Time is adjusted by `nrHands`. A throw of length 7 with `nrHands=4` is the same as a 3.5 with `nrHands=2`, but it provides for a more intuitive representation with 2 hands for synchronous and 4 hands for four-handed siteswaps.

### Parsing

Patterns can be created from different notations, including siteswaps, simple synchronous notations, and multi-row notations with layouts. Different parsers are used but each creates a `Pattern` object at the end.
Parsing handles many complicated issues like hand ordering, so that the resulting `Pattern` representation remains fairly simple.

### Layout and animations

The pattern layer has no notion of space; it covers throws, hands, and roles only. Positions and movement are tracked with separate functionality.

`Layout` represents static positions in a 2D space. Positions are always relative (between 0 and 1) and can be scaled from there for rendering.

Animations are described with an `AnimationSpec` object that describes initial positions and movement paths. They can be derived from certain layouts (possibly coded or derived from an SVG) or, for manipulators, computed relative to other locations. The `LocationManager` resolves positions over time, including relative positions that may depend on other relative positions. Manipulator patterns use two layout managers: a layout manager for the base pattern (without manipulators), and the layout manager for the manipulator pattern that may refer to positions in the base pattern.

Animations are generally expressed in terms of roles, not persons, and the pattern may need to repeat many times until the animation returns to the starting point in space.

Animations run against a single continuously increasing timer (time). An animation fires when `(time % mod) == onBeat`; fractional beats are allowed. `mod` equals the pattern length for static patterns, but may span multiple iterations in movement patterns until all passers return to their original starting positions. Relabeling happens before animations on the same beat, so "role X on beat n" always refers to the assignment after that beat's relabeling.

Extra functionality is provided for animations in manipulator patterns to skip movement before the first action of a person (e.g., in Scrambled V, C does not start by walking). This adds quite a bit of complexity to track what happens only in later iterations.

While `AnimationSpec` is a general description in terms of roles of how animations should happen, `AnimationPlan`, created from a spec by `create-animation-plan.ts`, resolves this into a format with all absolute locations and clear passer indices. This is what the browser runtime executes with minimal runtime computations.

### JIF

The `Pattern` representation is distinct from the Juggling Interchange Format, but shares many similarities. Several issues like hand order are solved slightly differently. The intention is to enable export to JIF at some point. The extensions for manipulators and movement do not have great correspondence yet.


## Development

```bash
deno install         # install dependencies
deno test -A         # run all tests across all modules
deno task gen-runtime  # compile browser animation runtime to dist/
deno task debug      # interactive pattern debug server at http://localhost:8000 (older alternative to the takeout-explorer tool)
```

## License

GPL 3, see [LICENSE](LICENSE).
