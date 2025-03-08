# Manipulator notation

The notation here stays close to the traditional Aidan notation, indicating manipulations on the beat the manipulated club is thrown indicating the receiving party [^1]. 

Actions can but do not need to be separated with spaces. Use `.` to indicate beats without actions. If the sequence is shorter than the base pattern, missing beats at the end are assumed to be without actions.


## Takeout actions
`z` -- Zip
`.` -- no action for one beat
`,` -- no action for half a beat (for four-handed siteswaps)
`SAB` -- substitute throw from A to B (target required, source only required if ambiguous otherwise [^1])
`IAB` -- intercept throw from A to B (target required, source only required if ambiguous otherwise)
`CAB` -- carry throw from A to B (target and source both optional)
`3` / `3pA` -- any normal throw notation, starting with a number or lowercase letter (but passes need a destination)
`(3, iA)` -- two actions on the same beat (here a self and an intercept) [^2]

Not yet implemented:
`'` -- a negative half beat for four-handed siteswaps -- e.g. `SA ' SB` indicates two substitutions a half beat apart rather than one beat apart


## Movement and flips
Modifiers for `S`, `I` and `C` relevant for movement and understanding the orientation of clubs:
`e` -- substitute/intercept **e**arly
`l` -- substitute/intercept **l**ate (default)
`v` -- substitute/intercept **v**ery late
`c` -- substitute/intercept as a **c**hop
`o` or `]` -- substitute/intercept from **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side.
`x` or `[` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to x). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side.
`b` -- intercept very late from **b**ehind the target's location
`f` -- zip with **f**lipping the club (`zf`) / flip only the active club on the carry (`CBf`), by default carry implies flipping both clubs

## Assumptions and notes
* If an intercept is noted only with the receiving role and there are multiple throws to that role on that beat, the highest throw is interpreted as the intercept. This mostly occurs if intercepting a carry, where the receiver has an empty hand (0) or zip on the same beat.
* Not currently supporting any takeouts of 0s or zips


Notes:
[^1]: Indicating only the receiving passer can be ambiguous in some patterns with passes of different length. For example, A might throw a `4pB` at the same time that B throws a self, both go to B. A cleaner notation, if designed from scratch could indicate the thrower on the throw beat or the receiver on the receiving beat.
[^2]: It is not common in existing patterns (at least in the notation), but especially on the intercept, the manipulator can do an action at the same time that the intercept is thrown but long before they catch it. The German turn in Roundabout is a good example where the hand-in can be written as a `1p` on the same beat as the intercept pass.