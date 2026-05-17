# Manipulator Pattern Notation

The first manipulator patterns were written down as lengthy wordy descriptions, similar to the description of [Nicki's three-count roundabout](6a-intro.md) in the previous chapter, but a common notation has emerged that allows us to capture the essence of these patterns compactly. This notation was originally suggested by Aidan Burns, and while it has evolved quite a bit with contributions from many in the community, it is widely called the Aidan notation.

## The Aidan Notation

The basic idea of the Aidan notation is as follows: A base pattern is described with a conventional passing notation, such as [basic synchronous throws](2b-basic-sync.md) or [moving group patterns](5d-moving.md). In addition, the action of each manipulator is described on a separate line below the base pattern. A manipulator's actions are described in terms of the three concepts *carry* (C), *substitution* (S), and *intercept* (I). To identify which throw is carried, substituted, or intercepted, we usually need two pieces of information: the time when it is thrown and the passer who will receive it. We notate this with the letters C, S, and I on the throw beats and use a subscript to identify the role of the passer who would receive it (sometimes additionally a superfix is added indicating the role where the pass is coming from).

In this notation, *Nicki's three-count roundabout* can be written as:

<sync-group style='{"components":["aidan"]}'>
A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..
</sync-group>


That is, on the first beat, the manipulator substitutes the throw to B, which is A's right-handed pass to B. On the third beat, a throw to B is intercepted, which is B's self. On the fourth beat, the manipulator carries the throw to A, which would have been a left-handed pass from B.

The scheme generalizes to patterns with more passers and more manipulators. For example, this is the notation for the five-person pattern [Scrambled 3-V](6f-aidan-patterns.md), with two manipulators M and N based on a [rotating two-count vs. four-count feed](5d-moving.md):

<sync-group style='{"components":["aidan"]}'>
A: 3pB3  3pC3  3pB3  -- B
B: 3pA3  3  3  3pA3  -- C
C: 3 3   3pA3  3  3  -- A
M: CBz   SBz   IC.   -- M
N: CCz   SAz   IBe.   -- N
positions: V(A,B,C)
move: Vmove(B,4.9,3)
</sync-group>

For common base patterns, especially for the [rotating two-count vs. four-count feed](5d-moving.md), it is also common to describe a manipulator pattern just in terms of the manipulator's actions – for example, describing [Scrambled V](6f-aidan-patterns.md) as C<sub>B</sub>S<sub>B</sub>I<sub>C</sub>.


## Changing Roles
One thing that makes the Aidan notation somewhat challenging to read is *relabeling*, where passers switch roles.
There are now two forms of relabeling: (1) The relabeling in the base pattern as described for [moving patterns](5d-moving.md) and (2) relabeling when the manipulator switches with a passer in the base pattern. Only the former is explicitly written down in the Aidan notation, with arrows at the end of a row.

The relabeling for switching manipulators is less obvious to recognize in the notation. It happens when the manipulator takes over the role of another passer *triggered by intercepting* a throw to that passer, often in the middle of the pattern. At the time the throw is intercepted, the passer who would otherwise have caught that throw becomes the new manipulator and continues with the manipulator's actions. 

In *Nicki's three-count roundabout*, the switch between M and B is triggered when M intercepts B's self (highlighted below). The intercepted self is thrown on beat 3 and intercepted on beat 4, so beat 4 is where M and B switch (also highlighted with background colors and changes during the animation). On beat 4, the previous manipulator now has two clubs and takes over the remainder of B's sequence, in this case by also catching the pass that A throws on beat 4 to B. At the same time, the previous passer in the role of B becomes the new manipulator M and starts with a carry on beat 4. At the end of the iteration, the passers in role B (originally M at the start of the iteration) and A swap roles, and the pattern repeats.

<sync-group style='{"components":["aidan","turntable","layout"], "emphasizeLines":[[1,2]],"emphasizeThrows":[[1,2]],"showRoleColorBackground":true, "showRelabel":false}'>
A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..
</sync-group>

**Turntable and turning back.**
Having both explicit relabeling at the end of the pattern and implicit relabeling at intercepts in the middle is not intuitive to read 
and can make it tedious to identify how roles change in the previous or next iteration of the pattern. 
Hence, it is now common to write a *turntable* about how roles change at the end of the pattern, like the "A → B → M → A" for *Nicki's three-count roundabout*. This shows that the passer with the role A will start the next iteration in role B, the passer in role B will start as M, and the passer in role M will start as A. 

When turning back to learn the previous iteration (usually a very good strategy to learn new patterns, see the corresponding explanation in [moving patterns](5d-moving.md)), we simply follow those arrows backward.

When the turntable is not available for a pattern and deriving this from the notation is inconvenient, here is another practical approach for turning back after having learned one or two iterations of a pattern: Juggle the pattern as a group for one iteration and stop. Everybody should now recognize which role they have (e.g., in *Nicki's three-count roundabout* B would recognize that they now do M's actions). Everybody now points to the person who previously had that role. The pointing should form a circle – the equivalent of the turntable above. To move back one iteration, everybody goes to the starting position of the person *who points at them*.

## Movement
As for [moving patterns](5d-moving.md), the Aidan notation does not describe how passers move, only when things happen.

Manipulator patterns usually inherit some movements from a base pattern, none in *Nicki's three-count roundabout* because the base pattern has only two stationary passers, but [walking feeds](5d-moving.md) are common as a base pattern for manipulator patterns with four or more passers. This is usually described together with the pattern.

There is also no common notation for describing the location of the manipulator or *how* they steal and place clubs (see the description of early vs late steals and placement from below vs above in our [introduction to manipulator patterns](6a-intro.md)). Some patterns have canonical forms that are passed verbally or through videos, but it is equally common that passers will just experiment and figure out what works. For example, for *Nicki's three-count roundabout*, I would recommend late steals for both substitution and intercept, placement from below for carry and substitution, and the manipulator moving to the left of the pattern when intercepting the self, but there are also videos of the pattern with other movements.

For this book, we experiment with optional superfix symbols for intercepts and passes to indicate common conventions. We use:
* `e` for early steals
* `l` for late steals
* `v` for very late steals
* `↑` for placement from below
* `↓` for placement from above
* `c` for a steal caught as a chop (see [Chopabout](6d-roundabout-variations.md))
* `o` for an action standing on the outside of the passing lane
* `x` for an action standing on the outside of the *opposite* passing lane
* `b` for an action standing behind the original receiver of a throw
* `↻` and `↺` for moving clockwise or counter-clockwise around a passer
* `f` for flipping a club on a zip

With this, *Nicki's three-count roundabout* indicates late steals, placement from below, and clockwise movement when B and M swap can be written as follows:

<sync-group style='{"components":["aidan"]}'>
A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SBl↑.IBl↑↻   C↻..
</sync-group>



## Local Notation (experimental)

<div class="warning">

*This notation is not common and likely only of interest to few who want to experiment with new patterns or gain a deeper understanding. Feel free to skip this.*

</div>

By now the Aidan notation is ubiquitous and well known and is widely used, but it has a couple of shortcomings. Among others, it can be difficult to see who is doing what and throwing where exactly after mid-pattern role switches, it can be difficult to see what exactly happens between intercept and carry (not a problem in *Nicki's three-count roundabout*, another reason why it is a good first teaching pattern), and it makes many of the standard pattern manipulations and computations from siteswaps and sync passing (e.g., computing starting hands) harder to apply.

As an alternative, some have recently explored writing manipulator patterns as normal passing patterns,
where intercepts and substitutions are just normal throws.
We use causal arrows, introduced in the context of [siteswap theory](4l-4hsw-theory.md), to show how clubs move (roughly: an arrow points to the time and place just before the throw is caught, when a previous action there needs to empty that hand).


With this, *Nicki's three-count roundabout* looks like this:

<sync-group style='{"components":["pattern"], "emphasizeLines":[[0,0],[2,0],[1,2],[1,3]],"emphasizeThrows":[[0,0],[2,0],[1,2],[1,3]]}'>
A: 3pB333pB33 -- B
B: 3pA333pA33 -- A
M: SB.IB↻   C↻..
</sync-group>

Now the pattern can be read like a walking pattern, seeing what each passer does and where the clubs actually go – each person corresponds to the actions of a physical person, even if they switch roles in between. It is no longer needed to read actions in a different row after a role change. If the changing roles (indicated with background colors) are confusing, ignore the roles in passes and simply see which row each pass goes to.

A substitution is visible as two passes: a pass (pelf) from the passer A to the manipulator, and a pass from the manipulator to B. We could model this in different ways, but we assume that the pelf has the same length as a zip (solo siteswap *1*, so the causal arrow goes backward) and the placement has the length of a normal pass; both are thrown on the same beat – the first beat in our example.

An intercept is now also just a pass to the manipulator. In our example, passer B's self on beat 3 is now a pass to the manipulator.

A carry is now also a pass, in our example, the pass from the second passer (initially row B) to the first passer.

The notation also fills all empty spots with empty hands (empty circle) or beats where a club is just held (and could be flipped). In our example, the manipulator has time after the substitution until intercepting the self on beat 3 and they could zip and flip a club in that time (in practice they usually have less time, because usually they place the substitution later than indicated and intercept the self earlier than indicated; in our explanation of the pattern we also recommend avoiding a zip and catching the club with the opposite hand, since this is easier to learn). Similarly, the new manipulator has two beats after the carry, where they could flip a club and wait briefly with an empty hand or zip their club twice.
