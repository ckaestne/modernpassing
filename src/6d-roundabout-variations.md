# Roundabout Variations

<progressions>

**Prerequisite —** [Roundabout](6c-roundabout.md)

**Helpful —** [Synchronous 7-club and 8-club patterns](2d-advanced.md) and [moving patterns](5d-moving.md)

</progressions>


There are many variations of *Roundabout*, patterns that incorporate *Roundabout* in larger group patterns, and patterns that are conceptually similar to the traditional *Roundabout*.



## Conceptually Related Patterns

After the standard *Roundabout*, there are a number of other 3-person patterns that are one-sided with all right-handed manipulations, each followed by a zip, that are good next patterns with only gently increased difficulty.

**Chopabout.** The *Chopabout* is a longer, more challenging pattern that introduces a new kind of takeout: the chop substitution. When substituting a pass from A to B on the first beat (highlighted), the manipulator faces A and steals the pass thrown as a chop and places the other club behind their back to B. The same happens in the opposite direction on the fifth beat. The passer throwing the chop usually needs to prepare a beat early with a narrow self, but in a pinch, a reverse spin zap or even a pelf or normal zap will do instead of a chop. The chop is caught with the left hand, upside down, catching the body (or the middle) of the club. The manipulator places the club behind them with the right hand, raising the hand high to make it easy for B to grab; B needs to actively look for the club. The placement is often done blind without looking, but with some practice, the manipulator has enough time to look back to check and improve their placement.

<sync-group video="https://www.youtube.com/watch?v=xAqx56CTIZs" todo="highlight the chop throws; fix carry from wrong hand" style='{"emphasizeThrows":[[0,0],[1,4]]}' frames="0,2,4,6,7,8,9,10,12">
A: 3pB3 33   3pB3 33   3pB3 33 -- B
B: 3pA3 33   3pA3 33   3pA3 33 -- A
M: SBcz SAlz SAcz SAlz IAv . CA 
</sync-group>

All spinning in *Chopabout* is clockwise, including the German turn at the end (as in *Roundabout*) and on the carry (opposite to *Roundabout*). The manipulator spins continuously except for the substituted self after the first chop. Usually the carry is placed with the left hand, so that no zip is needed to catch the chop just afterward.

**Three-count roundabouts.** Beyond [Nicki's three-count roundabout](6a-intro.md), there are two classic one-sided, right-handed *Roundabout* versions based on *6-club three-count*.

<!-- TODO: this breaks the assumptions of the automated carry computation, because the new B throws an unforced pass? -->

<sync-group  style='{"components":["aidan","video"]}' video="https://youtu.be/94PLxzRh5Ec?si=6z2O5qaDtiMI8x2w&t=8" frames="">
A: 3pB 3 3   3pB 3 3 -- B
B: 3pA 3 3   3pA 3 3 -- A
M: SBl z IBl .   Cz
</sync-group>

In this one, the manipulator intercepts a self, turns around, and passes that intercepted club immediately on the next beat as B with their left hand – this is very fast for the manipulator.


<sync-group video="https://youtu.be/94PLxzRh5Ec?si=RpjfOMKeDUPCCuXE&t=34" frames="auto">
A: 3pB 3 3   3pB 3 3 -- B
B: 3pA 3 3   3pA 3 3 -- A
M: CB↺↑  z SBl↑ z   IB↺
</sync-group>

This one is fairly straightforward, except that there is little space to place the club for the substitution, because B throws a left-handed pass at that point. Therefore, the manipulator typically places the substitution from below, even though it is a self.

**Champi.** *Champi* is a short, one-sided takeout pattern based on *6-club pass-pass-self* that includes a chop on the fifth beat (see *Chopabout* above).

<sync-group video="https://passing.zone/champi/"  style='{"emphasizeThrows":[[1,4]]}' frames="auto">
A: 3pB 3pB 3   3pB 3pB 3 -- B
B: 3pA 3pA 3   3pA 3pA 3 -- A
M: IB  CA  z   z   SAc z
</sync-group>




## Messing with Roundabout

As many passers know the classic *Roundabout* so well, there are several more or less silly variations to challenge the pattern.

**Long-distance Roundabout.** Sometimes used for games, the idea is to start *Roundabout* at a normal distance but continuously have to move the passers further apart, making the passes longer and longer and requiring the manipulator to cover increasingly long distances.

**Tess-about.** The idea is to isolate one passer in place and have the pattern move around them. This can accommodate passers who cannot or do not want to walk, and can be an interesting challenge in itself. Usually the isolated passer stands (or sits) in one location but can turn. When the isolated passer would walk across the pattern, instead the other two passers walk the opposite direction to move the entire pattern relative to the isolated passer. The sequence is fairly easy to learn and repeats quickly. The general idea can be used to *tessify* any moving and manipulator pattern.

<video link="https://passing.zone/roundabout-with-isolated-person/"></video>

**Clubabout.** Instead of isolating a passer, here a club is isolated and the pattern moves around the club. That is, if the club would be passed, it is just thrown straight up, and all passers move relative to the club. Typically the club is isolated only in the direction between the passers, allowing some wiggle room for movement between the left and the right hand; a line on the floor is usually used to indicate the position. The pattern is exceedingly long (192 beats, since each club goes through all positions in *Roundabout* in a single orbit), but it is a fun and silly exercise to try any segment of it.

<video></video>


## 4 and 5 Person Patterns based on Roundabout

**Two manipulators (4 passers).** A simple way to include a fourth passer is to have two manipulators doing the roundabout sequence but in opposite directions. 

<sync-group frames="auto">
A: 3pB333 3pB333 -- B
B: 3pA333 3pA333 -- A
M: SBe z SBl z IBvo . CB↺ z
N: SAe z SAl z IAvo . CA↺ z
</sync-group>

**Shooting star with Roundabout (5 to 7 passers).** A manipulator doing the *Roundabout* manipulation can be integrated into the moving pattern [Shooting star](5d-moving.md) in the variation where a passer walks after every other pass with *one* club. The manipulator simply does the roundabout sequence between C and A, swapping out the target passer who then does the roundabout sequence on the next segment of the star.

<sync-group frames="auto">
A: 3pD 333 3pD 333   -- C
B: 0 1 22 2 333-- D
C: 3pA 222 3pA   202   -- B
D: 3pB   333 3pB   333 -- A
N: SAe z SAl z IAvo . CA↺ z
positions: Circle(A,B,C,D,_)
move: Cmove(C,4.9,2.5,144,1)
</sync-group>

<video>todo</video>

Variations:
* Additionally or alternatively, additional manipulators can do the roundabout sequence between D and B and between A and D, supporting up to three Roundabout manipulators in the pattern at the same time.
* Furthermore, in what's called *Shooting star with manipulator and chaser,* when manipulating between C and A, rather than waiting with two clubs for their last pass, C can follow the manipulator M across the pattern when M substitutes the pass to A and bring the manipulator the intercepted pass, to then run to their position behind A (on the outside of the circle). 

<video>todo</video>




**Bounceabout (4 passers).** *Bounceabout* is a fairly easy *Roundabout*-style pattern for four passers doing a kind of *two-count* vs. *four-count* feed in a [triangle formation](5c-static-groups.md). The takeout sequence is Roundabout-like but two beats longer, substituting a second pass (i.e., bounding off of one corner to the next) before substituting the self and swapping roles.


<sync-group frames="auto">
A: 3pB3 3pC3 3pC3 3pC3 33   -- B
B: 3pA3 33   3pA3 33   3pC3 -- C
C: 33   3pA3 3pB3 3pA3 3pB3 -- A
N: SAe z SBl z IBvo . CB↺ z SCe z  
positions: Circle(A,B,C)
</sync-group>


## Adding Extra Clubs

There have been several attempts to create *Roundabout*-style patterns that use more clubs and higher passes. Most commonly, the goal is to keep the manipulator sequences as in the base pattern, but have the two passers juggle a harder sequence with an extra club.

**Extra-club roundabout.** The original *extra-club roundabout* is a good example of this strategy. Notice that the manipulator actions are the same as in *Roundabout* and all throws that are stolen remain unchanged from the base pattern (highlighted), but a lot of other throws are changed to crossing double passes and heffs. Due to quirks of the notation, the intercept is notated one beat earlier, since it is intercepting a double pass thrown one beat earlier, but caught at the same time as in regular roundabout. The base pattern itself is a challenging, long synchronous 7-club pattern, specifically designed to keep the manipulator actions unchanged.

<sync-group style='{"emphasizeThrows":[[0,0],[1,2]]}'>
A: 3B 4 4 4pB 4 4 4 4pB -- B
B: 4pA 333 3pA 333 -- A
M: SBe z SBl IBvo .. CB↺ z
</sync-group>

**Ronjabout.** *Ronjabout* is a newer and more elegant solution to the problem, making the pattern one beat longer but maintaining a simpler base pattern with all straight double passes (with the [usual trick](2d-advanced.md) of having one passer start left-handed). Here the manipulator is technically substituting a double pass and has more time for the substitution, though it may be barely noticeable as they wait for an empty hand anyway.

<sync-group video="https://passing.zone/ronjabout/" style='{"emphasizeThrows":[[0,0],[1,3]]}'>
A: 4pBx 3   5 3 4pBx 3   5 3 4pBx -- B
B: !3   4pAx 3 3 3   4pAx 3 3 3 -- A
M: SBe! . 1x     SBl IBv.. CB↺  -- M
</sync-group>


**Beyond.** While not common, there are challenging extra-club versions of many common patterns and also patterns that add two clubs (e.g., [*9-club Roundabout*](https://passing.zone/9-club-roundabout/)), with triple passes and trelfs. Cameron Ford created an excellent [video explaining concepts and showing examples](https://vimeo.com/1046051913). For other takeout patterns on more challenging base patterns of seven and more clubs explore [takeouts in four-handed siteswaps](6i-siteswap-takeouts.md). 



