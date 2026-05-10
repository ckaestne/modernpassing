/**
 * Pure-data layout for the "debug" pattern view that prettyPrintThrowsSvg
 * renders as SVG. Returns plain JSON-serializable data so the same view can
 * be rendered by a React component (or anything else) without depending on
 * svg.js / svgdom / a server.
 *
 * Geometry is identical to prettyPrintThrowsSvg — same positions, same
 * arrow paths, same colors — just expressed as data.
 */

import {
  type CarryMarker,
  Hand,
  type InterceptMarker,
  type Pattern,
  type SubstitutionMarker,
  type Throw,
  type ThrowMarker,
} from "@modernpassing/pattern";

export type LabelKind = "beat-header" | "row-start" | "row-end" | "throw";
export type HandLabel = "right" | "left";
export type CrossingKind = "self" | "straight-pass" | "cross-pass";
export type MarkerCategory = "intercept" | "substitution" | "carry" | "other";

export type MarkerTooltipSpec = {
  kind: string;
  category: MarkerCategory;
  label: string;
  summary: string;
};

export type TextSpec = {
  x: number;
  y: number;
  text: string;
  fill?: string;
  kind: LabelKind;
};

export type DotSpec = {
  cx: number;
  cy: number;
  fill: string;
  beat: number;
  rowIdx: number;
  role: string;
  hand: HandLabel;
};

export type ThrowSpec = {
  id: string;
  x: number;
  y: number;
  label: string;
  fill: string;
  beat: number;
  rowIdx: number;
  hand: HandLabel;
  fromPasserIdx: number;
  fromRole: string;
  toPasserIdxAtThrow: number;
  toRoleAtThrow: string;
  toPasserIdxOnCausal: number;
  toRoleOnCausal: string;
  targetHandFirstIteration: HandLabel;
  throwLength: number;
  causeBeat: number;
  causeTime: number;
  causeLength: number;
  crossing: CrossingKind;
  markerTooltips: MarkerTooltipSpec[];
  annotation: string;
};

export type ArrowSpec = {
  id: string;
  throwId: string;
  d: string;
  stroke: string;
  dashed: boolean;
};

export type ErrorSpec = {
  x: number;
  y: number;
  message: string;
};

export type DebugPatternLayout = {
  width: number;
  height: number;
  texts: TextSpec[];
  dots: DotSpec[];
  throws: ThrowSpec[];
  arrows: ArrowSpec[];
  errors: ErrorSpec[];
};

const DIST = 100;

const CROSSING_SYMBOL: Record<CrossingKind, string> = {
  "self": "",
  "straight-pass": "‖",
  "cross-pass": "X",
};

const handLabel = (hand: Hand): HandLabel =>
  hand === Hand.Left ? "left" : "right";

const handColor = (hand: Hand): string => hand === Hand.Left ? "green" : "blue";

const formatModifiers = (modifiers: string | undefined) =>
  modifiers ? `; modifiers: ${modifiers}` : "";

function markerTooltip(marker: ThrowMarker): MarkerTooltipSpec {
  switch (marker.kind) {
    case "I": {
      const m = marker as InterceptMarker;
      return {
        kind: m.kind,
        category: "intercept",
        label: "Intercept",
        summary: `${m.fromRole} intercepts original ${m.originalFromRole} -> ` +
          `${m.originalToRoleAtThrow} (length ${m.originalThrowLength})` +
          formatModifiers(m.modifiers),
      };
    }
    case "S": {
      const m = marker as SubstitutionMarker;
      const throwSide = m.throw === "P" ? "pelf side" : "substituted side";
      return {
        kind: m.kind,
        category: "substitution",
        label: "Substitution",
        summary:
          `${throwSide}: ${m.fromRole} -> ${m.toRoleAtThrow}; action ${m.uniqueKey}` +
          formatModifiers(m.modifiers),
      };
    }
    case "C": {
      const m = marker as CarryMarker;
      return {
        kind: m.kind,
        category: "carry",
        label: "Carry",
        summary:
          `${m.originalFromRole} -> ${m.toRoleAtThrow} after ${m.carryDelay} beats` +
          formatModifiers(m.modifiers),
      };
    }
    case "B":
      return {
        kind: "B",
        category: "other",
        label: "Base",
        summary: "base throw marker",
      };
    case "M":
      return {
        kind: "M",
        category: "other",
        label: "Manipulator Base",
        summary: "manipulator-generated base marker",
      };
    case "F":
      return {
        kind: "F",
        category: "other",
        label: "Filled",
        summary: "automatically filled throw",
      };
    default:
      return {
        kind: marker.kind,
        category: "other",
        label: `Marker ${marker.kind}`,
        summary: "unrecognized marker",
      };
  }
}

function throwId(t: Throw): string {
  return `throw-${t.fromPasserIdx}-${t.throwBeat}-${t.toPasserIdxAtCausal}-${t.throwLength}`;
}

function arrowPath(x1: number, y1: number, x2: number, y2: number): string {
  const xDiff = x2 - x1;
  if (xDiff === 0) {
    const flip = 20;
    return `M ${x1} ${y1} C ${x1 - flip} ${y1 - flip}, ${x2 + flip} ${
      y2 - flip
    }, ${x2} ${y2}`;
  }
  const bend = xDiff > 0 ? 0 : (DIST / 5.5) * (xDiff / DIST) * 0.9;
  return `M ${x1} ${y1} C ${x1 + bend} ${y1 + bend}, ${x2 - bend} ${
    y2 + bend
  }, ${x2} ${y2}`;
}

export function computeDebugPatternLayout(
  pattern: Pattern,
): DebugPatternLayout {
  const width = (pattern.getLength() + pattern.getPrefixLength() + 4) * DIST;
  const height = (pattern.nrRows + 2) * DIST;

  const getX = (beat: number) => (beat + pattern.getPrefixLength() + 2) * DIST;
  const getY = (rowIdx: number, hand: Hand) =>
    (rowIdx + 2) * DIST + (hand === Hand.Left ? 7 : -7);

  const getRoleAtBeat = (beat: number, rowIdx: number) =>
    pattern.getRole(Math.max(0, beat), rowIdx);

  const texts: TextSpec[] = [];
  const dots: DotSpec[] = [];
  const throws: ThrowSpec[] = [];
  const arrows: ArrowSpec[] = [];
  const errors: ErrorSpec[] = [];
  const seenDots = new Set<string>();

  const buildThrowSpec = (
    t: Throw,
    beat: number,
    rowIdx: number,
    isPrefix: boolean,
  ): ThrowSpec => {
    const hand = pattern.getThrowHand(t, 0);
    const toRoleAtThrow = pattern.getToPasserRole(t);
    const toPasserIdxAtThrow = pattern.getToPasserIdxAtThrow(t);
    const toPasserIdxOnCausal = pattern.getToPasserIdxOnCausal(t);
    const targetHand = pattern.getTargetHandFirstIteration(t);
    const causeBeat = pattern.getThrowCauseBeat(t);
    const causeTime = pattern.getThrowCauseTime(t);
    const causeLength = pattern.getThrowCauseLength(t);
    const toRoleOnCausal = pattern.getRole(causeBeat, toPasserIdxOnCausal);

    const isSelfThrow = pattern.isSelfThrow(t);
    const crossing: CrossingKind = isSelfThrow
      ? "self"
      : pattern.isStraightPass(t, 0)
      ? "straight-pass"
      : "cross-pass";

    const markerTooltips = (t.markers ?? []).map(markerTooltip);
    const annotation = markerTooltips.map((m) => m.kind).join("");

    const targetFirstIteration = `${toPasserIdxOnCausal}${
      targetHand === Hand.Left ? "L" : "R"
    }${causeBeat}`;
    const label = `${t.throwLength}${toRoleAtThrow}${
      CROSSING_SYMBOL[crossing]
    }${targetFirstIteration}${annotation}`;

    const offset = isPrefix ? 0 : 5;
    return {
      id: throwId(t),
      x: getX(beat) + offset,
      y: getY(rowIdx, hand) + offset,
      label,
      fill: handColor(hand),
      beat,
      rowIdx,
      hand: handLabel(hand),
      fromPasserIdx: t.fromPasserIdx,
      fromRole: getRoleAtBeat(beat, rowIdx),
      toPasserIdxAtThrow,
      toRoleAtThrow,
      toPasserIdxOnCausal,
      toRoleOnCausal,
      targetHandFirstIteration: handLabel(targetHand),
      throwLength: t.throwLength,
      causeBeat,
      causeTime,
      causeLength,
      crossing,
      markerTooltips,
      annotation,
    };
  };

  const pushDot = (rowIdx: number, beat: number, hand: Hand) => {
    const dotId = `${rowIdx}-${beat}-${handLabel(hand)}`;
    if (seenDots.has(dotId)) return;
    seenDots.add(dotId);
    dots.push({
      cx: getX(beat),
      cy: getY(rowIdx, hand),
      fill: handColor(hand),
      beat,
      rowIdx,
      role: getRoleAtBeat(beat, rowIdx),
      hand: handLabel(hand),
    });
  };

  // Header row: "Beat" plus beat numbers + default hand
  texts.push({
    x: DIST,
    y: DIST,
    text: "Beat" +
      (pattern.globalHandOrderOffset !== 0
        ? " ::" + pattern.globalHandOrderOffset
        : ""),
    kind: "beat-header",
  });
  for (
    let beat = -pattern.getPrefixLength();
    beat < pattern.getLength();
    beat++
  ) {
    texts.push({
      x: getX(beat),
      y: DIST,
      text: `${beat} ${pattern.getGlobalHand(0, beat) ? "L" : "R"}`,
      kind: "beat-header",
    });
  }

  // Per-row labels and throws
  for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
    const myThrows = pattern.throws
      .filter((t) => t.fromPasserIdx === rowIdx)
      .sort((a, b) => a.throwBeat - b.throwBeat);

    texts.push({
      x: DIST,
      y: getY(rowIdx, Hand.Right),
      text: `${rowIdx} (${pattern.getRole(0, rowIdx)})`,
      kind: "row-start",
    });

    for (const t of myThrows) {
      if (
        t.throwBeat < -pattern.getPrefixLength() ||
        t.throwBeat >= pattern.getLength()
      ) continue;
      const isPrefix = t.throwBeat < 0;
      if (!isPrefix) {
        pushDot(rowIdx, t.throwBeat, Hand.Right);
        pushDot(rowIdx, t.throwBeat, Hand.Left);
      }
      throws.push(buildThrowSpec(t, t.throwBeat, rowIdx, isPrefix));
    }

    texts.push({
      x: getX(pattern.getLength()),
      y: getY(rowIdx, Hand.Right),
      text: `-> ${pattern.mapRows[rowIdx]} [${
        pattern.getRole(pattern.getLength(), rowIdx)
      }]`,
      kind: "row-end",
    });
  }

  // Index throws to detect conflicts and draw causal arrows.
  // Key by `${rowIdx}-${hand}-${beat}`; only one throw can be thrown/caught per slot.
  const slotKey = (rowIdx: number, hand: Hand, beat: number) =>
    `${rowIdx}-${hand}-${beat}`;
  const thrown = new Map<string, Throw>();
  const caught = new Map<string, Throw>();

  for (const t of pattern.throws) {
    if (t.throwBeat < 0) continue;
    const hand = pattern.getThrowHand(t, 0);
    const fromKey = slotKey(t.fromPasserIdx, hand, t.throwBeat);
    if (thrown.has(fromKey)) {
      errors.push({
        x: getX(t.throwBeat),
        y: getY(t.fromPasserIdx, hand),
        message: "multiple throws",
      });
    } else {
      thrown.set(fromKey, t);
    }

    const causeBeat = pattern.getThrowCauseBeat(t);
    const targetHand = pattern.getTargetHandFirstIteration(t);
    const to = pattern.getToPasserIdxOnCausal(t);
    const toKey = slotKey(to, targetHand, causeBeat);
    if (caught.has(toKey)) {
      errors.push({
        x: getX(causeBeat),
        y: getY(to, targetHand),
        message: "multiple catches",
      });
    } else {
      caught.set(toKey, t);
    }

    arrows.push({
      id: `arrow-${arrows.length}`,
      throwId: throwId(t),
      d: arrowPath(
        getX(t.throwBeat),
        getY(t.fromPasserIdx, hand),
        getX(causeBeat),
        getY(to, targetHand),
      ),
      stroke: handColor(targetHand),
      dashed: pattern.getThrowCauseLength(t) < 0,
    });
  }

  // throws / catches without their counterpart
  for (let rowIdx = 0; rowIdx < pattern.nrRows; rowIdx++) {
    for (let beat = 0; beat < pattern.getLength(); beat++) {
      for (const hand of [Hand.Right, Hand.Left]) {
        const key = slotKey(rowIdx, hand, beat);
        const hasThrown = thrown.has(key);
        const hasCaught = caught.has(key);
        if (hasThrown !== hasCaught) {
          errors.push({
            x: getX(beat),
            y: getY(rowIdx, hand),
            message: hasThrown ? "throw without catch" : "catch without throw",
          });
        }
      }
    }
  }

  // crossing/straight consistency check
  for (const t of pattern.throws) {
    const causeTime = pattern.getThrowCauseTime(t);
    if (causeTime < pattern.getLength()) continue;
    const causeBeat = pattern.getThrowCauseBeat(t);
    const toHand = pattern.getTargetHand(t, 0);
    const targetHand = pattern.getTargetHandFirstIteration(t);
    const causedThrow = thrown.get(
      slotKey(t.toPasserIdxAtCausal, targetHand, causeBeat),
    );
    if (!causedThrow) continue;
    const causedThrowHand = pattern.getThrowHand(
      causedThrow,
      Math.floor(causeTime / pattern.getLength()),
    );
    if (toHand !== causedThrowHand) {
      errors.push({
        x: getX(causeBeat),
        y: getY(t.toPasserIdxAtCausal, toHand),
        message: "inconsistent crossing/straight",
      });
    }
  }

  return { width, height, texts, dots, throws, arrows, errors };
}
