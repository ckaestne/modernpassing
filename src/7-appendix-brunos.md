# Appendix: Bruno's Variations

For completeness, these are a list of less common [Bruno's nightmare](5d-moving.md) variations.


**Five-beat Bruno's.**

A longer version of Bruno's has the walking passer pass twice to the feeder while walking:

<sync-group>
A: 3pB3 3pC3 3pB3 3pC3 3pB3 -- B
B: 3pA3 3  3 3pA3 33   3pA3 -- C
C: 33   3pA3 33   3pA3 33   -- A
positions: Svg(shapes/bruno5.svg,A,0,B,4,C,3)
move: move(B,1.9,2)move(B,4.9,3)move(B,8.9,3)move(C,2.9,3)
</sync-group>


**Pass-pass-self Bruno's.**
There is sufficient time in standard three-count Bruno's too double up on all passes:

<sync-group>
A: 3pB3pB3 3pC3pC3 3pB3pB3 -- B
B: 3pA3pA3 333   3pA3pA3 -- C
C: 333   3pA3pA3 333   -- A
positions: Brunos(A,B,C)
move: Bmove(B,2.9,3)Bmove(B,7.9,4)Bmove(C,4.9,4)
</sync-group>

A pattern on a more traditional pass-pass-self feed is substantially more challenging, and the walking passer has two passes during their walk across the pattern as in five-beat Bruno's:

<sync-group>
A: 3pB3pC3 3pB3pC3 3pB3pC3 -- B
B: 3pA33   3pA33   3pA33 -- C
C: 33pA3   33pA3 33pA3   -- A
positions: Svg(shapes/bruno5.svg,A,0,B,4,C,3)
move: move(B,0.9,2)move(B,3.9,2)move(B,6.9,2)move(C,1.9,2)
</sync-group>

**Pass-pass-self-pass-self Bruno's.**

A much faster version (though not as fast as Bruno's one-count) is a feed in pass-pass-self-pass-self:

<sync-group>
A: 3pB33pC3pB3 -- B
B: 3pA33  3pA3 -- C
C: 333pA33   -- A
positions: Brunos(A,B,C)
move: Bmove(B,1.3,1.6)Bmove(B,3.9,3)Bmove(C,2.9,2)
</sync-group>


**Magermix (one-count).**

Magermix on one-count vs two-count is a very challenging pattern for six passers:

<sync-group>
A: 3pB 3pC 3pB 3pC 3   3pC -- C
B: 3pA 3   3pA 3   3pF 3   -- D
C: 3   3pA 3   3pA 3pE 3pA -- B
D: 3pE 3pF 3pE 3pF 3   3pF -- F
E: 3pD 3   3pD 3   3pC 3   -- A
F: 3   3pD 3   3pD 3pB 3pD -- E
positions: Svg(shapes/magermix.svg,A,0,B,3,C,2,D,6,E,9,F,8)
move: move(B,0.9,1)move(C,1.6,1.3) move(B,2.9,1)move(A,3.9,1)move(A,5.9,1)move(B,4.9,1)
move: move(E,1.3,.6)move(F,1.6,1.3)move(E,2.9,1) move(D,3.9,1)move(D,5.9,1)move(E,4.9,1)
</sync-group>

**441 Bruno's.**

Beyond the cascade, the passers can walk in the shape of any other juggling pattern --
here is an example of a pattern with walking based conceptually on the solo pattern 441:

<sync-group>
A: 3pB33 3pC33 3pB33 3pC33 333   3pC33 -- C
B: 3pA33 333   3pA33 333   3pC33 333   -- A
C: 333   3pA33 333   3pA33 3pB33 3pA33 -- B
positions: Svg(shapes/bruno441.svg,A,8,B,1,C,4)
move: move(B,0.9,5)move(C,3.9,5)move(A,9.9,5)move(C,12.9,2)move(B,12.9,5)
</sync-group>


**Babymix (441, one-count).**

This 441-based pattern can also be passed in one-count vs. two-count:

<sync-group>
A: 3pB 3pC 3pB 3pC 3   3pC -- C
B: 3pA 3   3pA 3   3pC 3   -- A
C: 3  3pA 3   3pA 3pB 3pA -- B
positions: Svg(shapes/bruno441.svg,A,8,B,1,C,4)
move: move(B,0.6,1.3)move(C,1.6,1.3)move(A,3.9,1)move(C,4.6,0.3)move(B,4.9,1)
</sync-group>