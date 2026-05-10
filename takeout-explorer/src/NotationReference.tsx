export function NotationReference() {
  return (
    <div className="content is-small mt-2">
      <h4>Throw Notation</h4>
      {
        /* <pre><code>{`throw: '(' atomicthrow ',' atomicthrow ')' | atomicthrow
atomicthrow: [0-9a-y](p)?[A-Z]?(x)?`}</code></pre> */
      }
      <ul>
        <li>
          A throw starts with height <code>[0-9a-y]</code> (siteswap-style,{" "}
          <code>a=10</code>).
        </li>
        <li>
          <code>p</code> after height means pass.
        </li>
        <li>
          Uppercase letter means the receiver role at throw time (for example
          {" "}
          <code>3A</code>, <code>3pA</code>).
        </li>
        <li>
          Trailing <code>x</code>{" "}
          means crossing opposite the expected hand mapping (for example{" "}
          <code>4x</code>, <code>3px</code>).
        </li>
        <li>
          <code>.</code> means skipped beat.
        </li>
        <li>
          Pair notation <code>(right,left)</code>{" "}
          means first throw right hand, second left hand.
        </li>
        <li>
          Whitespace between throws is optional (for example <code>3p3p42</code>
          {" "}
          is <code>3p 3p 4 2</code>).
        </li>
      </ul>

      <h4>Siteswaps</h4>
      <pre><code>{`siteswap: [0-9a-y]+`}</code></pre>
      <ul>
        <li>
          Vanilla siteswaps can be written directly (for example{" "}
          <code>756</code>).
        </li>
        <li>
          Both passers start right-handed.
        </li>
        <li>
          This corresponds to equivalent group notation with one row offset by
          half/one beat depending on timing mode.
        </li>
      </ul>

      <h4>Sync</h4>
      <ul>
        <li>
          One-row shorthand for symmetric two-passer sync patterns (for example
          {" "}
          <code>3p33</code>).
        </li>
        <li>
          Both passers start right-handed and throw with the hand they receive
          with (supports Jim&apos;s patterns).
        </li>
        <li>
          For asymmetry, prefixes, or more passers, use group notation.
        </li>
      </ul>

      <h4>Group Notation</h4>
      <p>
        Most flexible format: up to 26 passers, prefixes, manipulators,
        relabeling, left-hand starts, positions, and movement.
      </p>
      <p>
        <code>sync-group</code> and <code>siteswap-group</code>{" "}
        differ only in timing assumptions (2-handed vs 4-handed convenience).
      </p>
      <p>
        General structure:{" "}
        <code>
          [passerrow]* [manipulatorrow]* [positionrow]? [movementrow]*
        </code>
      </p>
      <pre><code>{`passerrow: rowlabel? leftstart? prefix? throw+ relabel? \\n
rowlabel: [A-Z] ':'
leftstart: '!'
prefix: throw+ '|'
relabel: '--' [A-Z]⇆?X?`}</code></pre>
      <ul>
        <li>
          Manipulator rows are like passer rows but no prefix, and use
          manipulator actions.
        </li>
        <li>
          Optional position row starts with <code>positions:</code>{" "}
          and predefined position specs.
        </li>
        <li>
          Optional movement rows start with{" "}
          <code>move:</code>/<code>movement:</code> and movement instructions.
        </li>
        <li>
          Missing row labels default to <code>A..Z</code>.
        </li>
        <li>
          Missing relabel defaults to self.
        </li>
        <li>
          Default start hand is right.
        </li>
      </ul>

      <h4>Hand Order Rules</h4>
      <ul>
        <li>
          Default hand order for sync: <code>[Right, Left]</code>.
        </li>
        <li>
          Default hand order for 4-handed:{" "}
          <code>[Right, Right, Left, Left]</code>.
        </li>
        <li>
          <code>!</code>{" "}
          between throws flips the hand order for following throws; can appear
          multiple times.
        </li>
        <li>
          <code>x</code> still marks throws to the non-default hand.
        </li>
        <li>
          With pair notation, first throw is always right hand; no automatic
          mirroring.
        </li>
        <li>
          Deprecated behavior: implicit per-iteration handedness inference
          without pair notation remains documented but should not be relied on.
        </li>
      </ul>

      <h4>Relabel Offsets</h4>
      <ul>
        <li>
          Relabeling can carry hand-order offsets to keep starts consistent
          across iterations.
        </li>
        <li>
          Use <code>[1]</code> (or <code>[2]</code>, <code>[3]</code>{" "}
          in 4-handed patterns) after relabel to force offset.
        </li>
        <li>
          <code>[0]</code>{" "}
          can be used for debugging to disable alternative offset attempts.
        </li>
      </ul>

      <h4>Prefix</h4>
      <ul>
        <li>
          Prefix is a sequence before iteration 1 and affects starting-hand
          computation.
        </li>
        <li>
          Prefix throws must land on pattern beats (cannot force another prefix
          throw).
        </li>
        <li>
          Prefix handedness currently assumes alternating opposite hand;
          explicit <code>!</code> in prefix is not supported.
        </li>
        <li>
          If some rows have no prefix, they are assumed inactive on those prefix
          beats.
        </li>
      </ul>

      <h4>Manipulator Notation</h4>
      <p>
        Actions are written on the beat where the manipulated club is thrown.
        Spaces are optional. Missing trailing beats default to no action.
      </p>

      <h5>Takeout Actions</h5>
      <ul>
        <li>
          <code>z</code>: zip
        </li>
        <li>
          <code>.</code> or <code>-</code>: no action for one beat
        </li>
        <li>
          <code>,</code>: no action for half a beat (4-handed)
        </li>
        <li>
          <code>SAB</code>: substitute throw from A to B (target required,
          source optional if unambiguous)
        </li>
        <li>
          <code>IAB</code>: intercept throw from A to B (target required, source
          optional if unambiguous)
        </li>
        <li>
          <code>CAB</code>: carry throw from A to B (target/source optional)
        </li>
        <li>
          <code>3</code> /{" "}
          <code>3pA</code>: normal throws (passes need destination)
        </li>
        <li>
          <code>(3 iA)</code>: two actions on one beat
        </li>
        <li>
          Not yet implemented: <code>&apos;</code>{" "}
          negative half beat (for example two substitutions half a beat apart).
        </li>
      </ul>

      <h5>Movement And Flip Modifiers</h5>
      <ul>
        <li>
          <code>e</code>: early substitution/intercept
        </li>
        <li>
          <code>l</code>: late substitution/intercept (default for
          substitutions)
        </li>
        <li>
          <code>v</code>: very late substitution/intercept (default for
          intercepts)
        </li>
        <li>
          <code>c</code>: chop-style substitution/intercept
        </li>
        <li>
          <code>dN</code>: delayed placement by N beats (default N=1)
        </li>
        <li>
          <code>↑</code>: placement from below (default pass substitution/carry)
        </li>
        <li>
          <code>↓</code>: placement from above (default self substitution)
        </li>
        <li>
          <code>o</code>: outside passing lane
        </li>
        <li>
          <code>x</code>: outside opposite passing lane
        </li>
        <li>
          <code>b</code>: very late intercept from behind
        </li>
        <li>
          <code>↻</code> or{" "}
          <code>↺</code>: clockwise/counter-clockwise arc movement on carry or
          post-intercept
        </li>
        <li>
          <code>f</code>: flip active club (<code>zf</code>, <code>CBf</code>)
        </li>
      </ul>

      <h5>Manipulator Assumptions And Notes</h5>
      <ul>
        <li>
          If intercept target is ambiguous, the highest throw to that role is
          chosen.
        </li>
        <li>
          Targets are resolved at arrival (causal) beat; role may differ by
          throw beat due to relabeling.
        </li>
        <li>
          Takeouts of 0s or zips are currently not supported.
        </li>
        <li>
          In local translation, early/late catches map together; very late
          catches stay on original landing timing.
        </li>
      </ul>
    </div>
  );
}
