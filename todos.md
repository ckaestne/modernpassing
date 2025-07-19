* Animation: Better positioning of manipulators in front of passers
* Animation: support for rotation? Or at least chops as a special case?
* Manipulator encoding: Three-count roundabout #1 does not follow the common assumption for a carry.
* Manipulator encoding: Have a way of expressing rhondaring for Nicki's three count roundabout and MinuEd 
* Walking and manipulator patterns on 4-handed siteswaps are more complicated and need more work regarding hand and crossing mapping. most of them not validating now (ignored tests and patterns)
* Some patterns need positions relative to other manipulators (see skipped "compute animation plan for Opernball" test), compute positions based on base positions first and then the others (do we need a graph algorithm?)