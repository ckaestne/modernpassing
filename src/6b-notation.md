# Manipulator Pattern Notation

The first manipulator patterns were written down as lengthy wordy descriptions, similar to the description of [Nicki's three-count roundabout](6a-intro.md) in the previous chapter, but a common notation has emerged that allows us to capture the essence of these patterns compactly.  This notation was originally suggested by Aidan Burns, and while it has evolved quite a bit with contributions from many in the community, it is widely called the Aidan notation.

## The Aidan Notation

The basic idea of the Aidan notation is as follows: A base pattern is described with a convention passing notation, such as [basic synchronous throws](2b-basic-sync.md) or [moving group patterns](5d-moving.md). In addition the action each manipulator is described on a separate line below the actions of the base pattern. A manipulator's action are described in terms of the three concepts carry, substitution, and intercept. To identify which throw is carried, substituted, or intercepted, we need usually use two pieces of information: The time when it is thrown and the passer who will receive it.

We then simply write the manipulator's actions as a sequence of carries, substitution, and intercepts identified with the letters C, S, and I on the beats where the corresponding club is thrown, and each letter receives a subfix of the passer's role who will or would receive it. (Sometimes also a superfix is added indicating the role where the pass is coming from.)

In this notation, *Nicki's three-count roundabout* can be written as:

<TODO-manipulator-sync style='{"aidanOnly": true}'>
A: 3pB333pB33 -> B
B: 3pA333pA33 -> A
M: SB.IBCA..
</TODO-manipulator-sync>

That is, on the first beat, the manipulator substitutes the throw to B, which is A's right-handed pass to B. On the third beat, a throw to B is intercepted which is B's self. On the fourth beat, the manipulator carries the throw to A, which would have been a left-handed pass from B.

The scheme generalizes to patterns with more passers and more manipulators. For example, this is the notation for the five-person pattern [Scrambled 3-V](6f-aidan-patterns.md), with two manipulators M and N based on a [rotating two-count vs. four-count feed](5d-moving.md):

<TODO-manipulator-sync style='{"aidanOnly": true}'>
A: 3pB3  3pC3  3pB3  -> B
B: 3pA3  3  3  3pA3  -> C
C: 3 3   3pA3  3  3  -> A
M: CBz   SBz   IC.   -> M
N: CCz   SAz   IB.   -> N
</TODO-manipulator-sync>

For common base patterns, especially for the [rotating two-count vs. four-count feed](5d-moving.md), it is also common to describe a manipulator pattern just in terms of the manipulator's actions -- for example, describing [Scrambled V](6f-aidan-patterns.md) as C<sub>B</sub>S<sub>B</sub>I<sub>C</sub>.



**Relabeling.**
One thing that makes the Aidan notation somewhat challenging to read is *relabeling*, where passers switch roles.
While relabeling was already introduced for [moving patterns](5d-moving.md), now we have two forms of relabeling: one swapping roles at the end of the sequence and one for switching manipulators.

The one for switching roles, indicated by arrows at the end of each row in the notation, is simply a shorthand to avoid having to repeat the pattern for each person in each position. For example, in *Nicki's three-count roundabout* it indicates that the two passers start with roles A and B and swap roles after two rounds of 3-count. Since the manipulator always manipulates the pass from A to B, this means that the manipulation changes directions. See the [moving patterns](5d-moving.md) for more details and examples.

The relabeling for switching manipulators is less obvious to recognize in the notation. It happens when the manipulator takes over the role of another passer *triggered by intercepting* a throw to that passer, and that passer then becomes the new manipulator. In *Nicki's three-count roundabout*, the switch between M and B is triggered when M intercept's B's self. After that the previous manipulator now has two clubs and takes over the remainder of B's sequence, in this case by also catching A's pass to B on beat 4. At the same time that the previous manipulator takes on the role of B, the previous passer in the role of B becomes the new manipulator M and starts with a carry on beat 4.

Taken together there are two relabeling events before the sequence repeats: First the relabeling between each manipulator and the passer who would have received the intercepted throw and then the relabeling at the end of the sequence. In *Nicki's three-count roundabout* that's first the swap between roles M and B when intercepting the self on beat 3 and then the swap between roles A and B at the end of the sequence. As a result, the passer who starts in role A ends up in role B, the passer who starts in role B ends up in role M, and the passer who starts in role M ends up in role A (after briefly being in role B).

To *turn back the pattern* to a previous start (see [moving patterns](5d-moving.md)), it is hence also necessary to do both relabeling in reverse. First, the end of period relabeling is reversed by following the arrows in the notation backward (here passers in role A and B swap) and then the manipulator relabeling is reversed by swapping the manipulator on their intercept (here passers in role M and B swap). 


## Local notation
The Aidan notation is compact and sufficient to describe even complicated patterns with multiple passers and multiple manipulators. However, the manipulator relabeling in the middle of the period can obfuscate what is really happening. The notation also ignores what exactly is happening after the intercept, where many patterns leave out throws (not *Nicki's three-count roundabout*, another reason why it is a good first teaching pattern).

An alternative notation, that we prefer here, is to show the actions of all jugglers, where a steal is shown as a throw from a passer to the manipulator and a place as a throw from the manipulator to a passer. We use causal arrows, introduced in the context of [siteswap theory](4l-4hsw-theory.md), to show how clubs move (roughly, an arrow points to the hand that needs to be emptied to catch the throw). With this, *Nicki's three-count roundabout* looks like this:

<TODO-manipulator-sync style='{"localOnly": true}'>
A: 3pB333pB33 -> B
B: 3pA333pA33 -> A
M: SB.IBCA..
</TODO-manipulator-sync>

Now the pattern can be read like a walking pattern, seeing what each juggler does and where the clubs actually go, with relabeling only at the end of the sequence. However, actions like substitutions are now shown with two arrows crossing lines, not by a single letter below the pattern. We use colors to indicate which juggler is acting as the manipulator (here, first role C then role B).



## Limitations and Extensions

Just as with walking patterns, the Aidan notation describes the actions of each juggler, but not how they are walking -- for example, whether the manipulator is turning out to the left or the right when swapping with passer B in *Nicki's three-count roundabout*. This is additional information that is either left open for the jugglers to decide (in *Nicki's three-count roundabout* both directions are possible, but moving to the left of B requires less walking through passing lanes) or needs to be provided in addition to the notation (e.g., explaining that [Scrambled V](6f-aidan-patterns.md) is juggled on a [rotating feed](5d-moving.md)). 

The notation also does not indicate how clubs are stolen or placed -- early, late, as a chop, from below, from above, and so forth. Again this is often left to the jugglers to decide, though many standard patterns have a canonical form. We tend to note *e* for early steal, *l* for late steal, *v* for very late steal, and *c* for late steal from a chop, each as a superfix on intercept and substitutions. In the local notation, the difference between early and late steal can be seen as shorter or longer throws to the manipulator. We do not denote the direction of placement and simply assume that all clubs placed instead of passes are placed from below and all clubs placed instead of selfs are placed from above.

Often we indicate zips that the manipulator performs to move a club to the other hand (like in the *Scrambled 3-V* notation above), but we could also leave those out and instead steal the next club with the other hand (as done to intercept the right-hand self with a right hand in *Nicki's three-count roundabout*). We also do not notate the rotation of each club in the manipulator's hand and when to flip them. Usually jugglers intuitively figure those out, once they get the hang of their first few manipulator patterns.

As people push what is possible, they discover many issues that seem at first confusing or impossible in the Aidan notation. There are patterns that feel like there are multiple intercepts raising the question about what an intercept actually is, patterns without a carry, patterns where a manipulator substitutes two passes at the same time, and several others. We will discuss them when we introduce the corresponding patterns.