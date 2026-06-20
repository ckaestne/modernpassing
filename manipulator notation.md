# Manipulator notation

The notation here stays close to the traditional Aidan notation, indicating manipulations on the beat the manipulated club is thrown indicating the receiving party [^1]. 

Actions can but do not need to be separated with spaces. Use `.` to indicate beats without actions. If the sequence is shorter than the base pattern, missing beats at the end are assumed to be without actions.


## Takeout actions
`z` -- Zip
`.` or `-` -- no action for one beat
`,` -- no action for half a beat (for four-handed siteswaps)
`SAB` -- substitute throw from A to B (target required, source only required if ambiguous otherwise [^1])
`IAB` -- intercept throw from A to B (target required, source only required if ambiguous otherwise)
`CAB` -- carry throw from A to B (target and source both optional)
`3` / `3pA` -- any normal throw notation, starting with a number or lowercase letter (but passes need a destination)
`(3 iA)` -- two actions on the same beat, first left than right hand (here a self and an intercept) [^2]

Not yet implemented:
`'` -- a negative half beat for four-handed siteswaps -- e.g. `SA ' SB` indicates two substitutions a half beat apart rather than one beat apart


## Movement and flips
Modifiers for `S`, `I` and `C` relevant for movement and understanding the orientation of clubs:
`e` -- substitute/intercept **e**arly
`l` -- substitute/intercept **l**ate (default for substitution)
`v` -- substitute/intercept **v**ery late (default for intercept)
`c` -- substitute/intercept as a **c**hop
`dN` -- substitution with **d**elayed placement; placement is delayed by N beats (default N=1) and consequently reduced in height (the German turn could be modeled as d2 with a delayed 1p placement, ambled 3 is d1 with a delayed 3p placement)

`↑` -- placement from below (default for pass substitution and carry) -- does not affect rendering
`↓` -- placement from above (default for self substitution) -- does not affect rendering


`o` -- substitute/intercept from or carry to **o**utside of the passing lane (inside is the default), only for early and late substitutions (`eo`, `lo`) and very late intercepts (`vo`; to the right of the receiver for a right-handed pass). For crossing passes, outside is relative to the receiving side. For actions *in front* of another passer (e.g., substituting a self), this means standing next of the passer on the side of the receiving hand.
`x` -- substitute/intercept from outside of the *opposite* passing lane (opposite side of the pattern to `o`). Used primarily to indicate turning out to the *left* for a right-handed very late intercept (`vx`). For crossing passes, outside is relative to the receiving side. For actions *in front* of another passer (e.g., substituting a self), this means standing next of the passer on the side opposite of the receiving hand.
`b` -- intercept very late from **b**ehind the target's location

`↻` or `↺` -- move clockwise or counter-clockwise in an arc to the target position after the intercept or for the carry (currently no effect on movement *to*  substitutions and *to* intercepts); default is direct movement

`f` -- zip with **f**lipping the club (`zf`) / flip only the active club on the carry (`CBf`), by default carry implies flipping both clubs

## Assumptions and notes
* If an intercept is noted only with the receiving role and there are multiple throws to that role on that beat, the highest throw is interpreted as the intercept. This mostly occurs if intercepting a carry, where the receiver has an empty hand (0) or zip on the same beat.
* The target of an intercept/carry/substitution is the passer who has the indicated role on the beat that the manipulated pass arrives (causal). This might be a different role than that person has by the time it is thrown. This is the usual interpretation, but means that an intercept/substitution on the very last beat of the pattern may have an unintutive role due to end-of-pattern relabeling (e.g., a self from A might go to B).
* Not currently supporting any takeouts of 0s or zips
* For translation to local: Substitutions and intercepts caught early and late are translated to the same 1p in the local notation; very late actions are caught on the original landing time in the local notation (with a 1p hand-in for a substitution).


Notes:
[^1]: Indicating only the receiving passer can be ambiguous in some patterns with passes of different length. For example, A might throw a `4pB` at the same time that B throws a self, both go to B. A cleaner notation, if designed from scratch could indicate the thrower on the throw beat or the receiver on the receiving beat.
[^2]: It is not common in existing patterns (at least in the notation), but especially on the intercept, the manipulator can do an action at the same time that the intercept is thrown but long before they catch it. This is used in Ambled 3 for the timetravel part. The German turn in Roundabout is a good example where the hand-in can be written as a `1p` on the same beat as the intercept pass.
