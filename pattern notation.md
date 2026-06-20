# Throw notation

```
throw: '(' atomicthrow atomicthrow ')' | atomicthrow
atomicthrow: [0-9a-y](p)?[A-Z]?(x)?
```

Patterns are written as sequences of throws. A throw starts with a digit or lowercase letter [a-y] representing its height (siteswap notation, 2 or 4handed; a=10).
A `p` after the height indicates a pass; an uppercase letter indicates the role of the receiver at the time the throw is thrown (e.g., `3A` or `3pA` indicates a pass to `A`).
A trailing `x` indicates a throw that's crossing hands opposite of what would be expected from the siteswap height (e.g. `4x` is a `4` to the other hand, `3px` is a crossing pass).

As special throws `.` (or alternatively `-`) indicates a skipped beat.

Parentheses can be used to express pairs of throws where the first throw in the pair is the right hand and the second the left hand, e.g. `(4p 4x)`.

A sequence of throws can be separated by white space, but does not need to be (e.g., `3p3p42 = 3p 3p 4 2`)


# Siteswaps

```
siteswap: [0-9a-y]+
```

Vanilla siteswaps can be written just as a siteswap sequence of digits/lower-case letters, e.g. `<siteswap>756</siteswap>`
Nothing special is needed.

Both passers are assumed to start right-handed.

This is equivalent to a multi-row group notation (see below) where one row starts half a beat later, as indicated with `,`.
```
<siteswap-group>
A: 7B  6 -- B
B: , 5A  -- A
</siteswap-group>
```
or as even-length siteswap
```
<siteswap-group>
7B  6  5B
, 5A 7A  6 
</siteswap-group>
```


# Sync

A basic one-row notation for sync two-passer patterns where both passers do the same actions on each beat is simply expressed as a sequence of throws, e.g., `<sync>3p33<sync>`

Both passers are assumed to start right-handed on the first beat. From there, they throw with the hand they receive with, thus supporting Jim's patterns.

This is simply a shorthand for the group notation:
```
<sync-group>
A: 3p33 -- A
B: 3p33 -- B
</sync-group>
```

For anything more complicated like different actions of each passer or prefixes, use the group notation.

# Group notation

Group notation is used for all other patterns and is the most flexible, supporting up to 26 passers, prefixes, manipulators, relabeling, left-hand starts, and more.

The two group notations `<sync-group>` and `<siteswap-group>` only differ in whether they assume 2-handed or 4-handed siteswap timing for notational convenience.

The general notation is `[passerrow]* [manipulatorrow]* [positionrow]? [movementrow]*`.

A passer row optionally starts with a role label (upper case letter followed by a colon), an optional `!` to indicate left-hand start, an optional sequence of prefix throws followed by `|`, a sequence of throws, and an optional relabeling:

```
passerrow: rowlabel? leftstart? prefix? throw+ relabel? \n
rowlabel: [A-Z] ':'
leftstart: '!'
prefix: throw+ '|'
relabel: ('--' | '→') [A-Z] ('offset:' [0-9])?
```

A manipulator row is the same as a passer row, but does not allow a prefix and has [manipulator throws](manipulator%20notation.md) instead of normal throws.

The optional position row starts with `positions:` followed by one of a set of predefined positions with roles as arguments.
The optional movement rows each starts with `move:` followed by one or more movement instructions from a predefined set with comma separated arguments.


If the row labels are not provided, rows are implicitly labeled with roles A to Z.
If the relabel instruction is not provided, rows are implicitly relabeled to themselves.
By default all rows start right-handed and have no prefix.

The default hand order is [Right, Left] for sync patterns, and [Right, Right, Left, Left] for 4-handed siteswap
patterns. That is, in 4-handed siteswaps, rows starting on beat 0 are passing straight singles and rows starting
a beat later on beat 1 are passing crossing singles.

To indicate throws that do not match the conventional hand order, an `!` between throws indicates that
all following throws are from the opposite hand. Multiple `!` per row can be used to switch back and forth.
To throw to the "wrong" hand, an `x` after the throw can be used as usual (e.g. `4x`, `3px` or `7Ax`).

If pair notation is used for throws, the first throw in the pair is always thrown from the right hand, there is no automated mirroring of hands (e.g., Techno needs to be written out with both sides). It is probably not a good idea to mix pair notation and single-throw notation in the same pattern.

*Deprecated, will be removed:* Without pair notation, handedness is inferred: By default, a passer starts right-handed and then alternates hands. The `!` can be used to swap the default order, typically before the first throw, but possibly also later in the pattern. Every throw that is forced by a throw in the same iteration (and only in the same iteration!) is thrown from the hand where a pass is caught -- this is usually enough to enable Jim's throws without using `!`.

Relabeling instructions can optionally indicate whether a hand offset is used. A hand offset shifts the hand order
at the end of the iteration. For example, an odd-period sync pattern would expect to start the next iteration
with the opposite hand, but an offset of 1 ensures every iteration starts with the same hand. In four-handed siteswaps
offsets from 1 to 3 are possible to shift an RRLL start into RLLR, LLRR, or LRRL for the next iteration.
By default 0 offset is used and if that is not a valid pattern, 1, 2, and 3 are tried.
To explicitly indicate an offset, add `offset: 1` after any of the relabeling instructions (e.g., `-- B offset: 1`).
For debugging, also `offset: 0` can be used to ensure that no alternative offsets are tried.

## Prefix

A prefix is a sequence of throws before the first iteration of the pattern. It affects starting hands computations.
A prefix throw happens before the first iteration of the pattern. A prefix throw must land on a beat of the pattern (i.e., cannot force another prefix throw).
For handedness, it is assumed that the prefix throw immediately before the pattern is thrown with the opposite hand of the first throw, the one before that again with the opposite hand and so forth. Specifying a different hand order with `!` in prefix throws is not currently supported. To start with a right-handed prefix throw, use `!` to flip the hands in the main pattern (e.g., 4px | !3 4px , 4px 3`)
If not all rows have prefix throws, it is assumed that the other passers have no actions on these beats.
