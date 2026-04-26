import { useState } from "react"
import type {
    ArrowSpec,
    CrossingKind,
    DebugPatternLayout,
    DotSpec,
    ErrorSpec,
    TextSpec,
    ThrowSpec,
} from "../api/pattern-debug-layout.ts"
import "./PatternCanvas.css"

type TooltipState = {
    x: number
    y: number
    lines: string[]
}

const CROSSING_LABEL: Record<CrossingKind, string> = {
    "self": "self throw",
    "straight-pass": "straight pass",
    "cross-pass": "cross pass",
}

function throwTooltipLines(t: ThrowSpec): string[] {
    const lines = [
        `From: passer ${t.fromPasserIdx} (${t.fromRole}), ${t.hand} hand, beat ${t.beat}`,
        `To: passer ${t.toPasserIdxAtThrow} (${t.toRoleAtThrow}) now; ${t.toPasserIdxOnCausal} (${t.toRoleOnCausal}) on causal beat (${t.causeBeat}); ${t.targetHandFirstIteration} hand`,
        `Duration: ${t.throwLength} beats`,
        CROSSING_LABEL[t.crossing],
    ]
    for (const marker of t.markerTooltips) {
        if (marker.category !== "other") lines.push(`${marker.label}: ${marker.summary}`)
    }
    if (t.causeLength < 0) {
        lines.push(`Causal relation: negative cause length (${t.causeLength})`)
    }
    return lines
}

function dotTooltipLines(d: DotSpec): string[] {
    return [
        "Hand position",
        `Passer ${d.rowIdx} (${d.role}) at beat ${d.beat}`,
        `Hand: ${d.hand}`,
    ]
}

function tooltipAt(e: { clientX: number; clientY: number }, lines: string[]): TooltipState {
    return { x: e.clientX, y: e.clientY, lines }
}

function arrowMarkerClass(throwSpec: ThrowSpec | undefined): string {
    if (!throwSpec) return ""
    const categories = new Set<string>()
    for (const m of throwSpec.markerTooltips) {
        if (m.category !== "other") categories.add(`arrow-${m.category}`)
    }
    return Array.from(categories).join(" ")
}

export function PatternCanvas({ layout }: { layout: DebugPatternLayout }) {
    const { width, height, texts, dots, throws, arrows, errors } = layout
    const [hoveredThrow, setHoveredThrow] = useState<string | null>(null)
    const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)

    const isHovering = hoveredThrow !== null || hoveredArrow !== null
    const highlightedThrowId =
        hoveredThrow ?? (hoveredArrow ? arrows.find((a) => a.id === hoveredArrow)?.throwId ?? null : null)

    const isHighlighted = (id: string) => id === highlightedThrowId
    const isDimmed = (id: string) => isHovering && !isHighlighted(id)

    const clearHover = () => {
        setHoveredArrow(null)
        setHoveredThrow(null)
        setTooltip(null)
    }

    return (
        <div className="pattern-canvas">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                onMouseLeave={clearHover}
            >
                <defs>
                    <ArrowMarker id="arrowhead-blue" color="blue" />
                    <ArrowMarker id="arrowhead-green" color="green" />
                </defs>

                {arrows.map((a) => (
                    <CausalArrow
                        key={a.id}
                        arrow={a}
                        relatedThrow={throws.find((t) => t.id === a.throwId)}
                        hovered={hoveredArrow === a.id}
                        dimmed={isDimmed(a.throwId)}
                        onHover={(throwSpec, e) => {
                            setHoveredArrow(a.id)
                            if (throwSpec) setTooltip(tooltipAt(e, throwTooltipLines(throwSpec)))
                        }}
                        onLeave={() => {
                            setHoveredArrow(null)
                            setTooltip(null)
                        }}
                    />
                ))}

                {dots.map((d) => (
                    <HandDot
                        key={`${d.rowIdx}-${d.beat}-${d.hand}`}
                        dot={d}
                        onHover={(e) => setTooltip(tooltipAt(e, dotTooltipLines(d)))}
                        onLeave={() => setTooltip(null)}
                    />
                ))}

                {texts.map((t, i) => <LabelText key={i} text={t} />)}

                {throws.map((t) => (
                    <ThrowLabel
                        key={t.id}
                        throwSpec={t}
                        hovered={isHighlighted(t.id)}
                        dimmed={isDimmed(t.id)}
                        onHover={(e) => {
                            setHoveredThrow(t.id)
                            setTooltip(tooltipAt(e, throwTooltipLines(t)))
                        }}
                        onLeave={() => {
                            setHoveredThrow(null)
                            setTooltip(null)
                        }}
                    />
                ))}

                {errors.map((err, i) => <ErrorMarker key={i} error={err} />)}
            </svg>

            {tooltip && <Tooltip tooltip={tooltip} />}
        </div>
    )
}

type MouseEv = React.MouseEvent<SVGElement>

function CausalArrow({
    arrow,
    relatedThrow,
    hovered,
    dimmed,
    onHover,
    onLeave,
}: {
    arrow: ArrowSpec
    relatedThrow: ThrowSpec | undefined
    hovered: boolean
    dimmed: boolean
    onHover: (relatedThrow: ThrowSpec | undefined, e: MouseEv) => void
    onLeave: () => void
}) {
    const className = [
        "arrow",
        arrowMarkerClass(relatedThrow),
        dimmed && "dim",
        hovered && "hovered",
    ].filter(Boolean).join(" ")

    return (
        <path
            d={arrow.d}
            fill="none"
            stroke={arrow.stroke}
            strokeWidth={2}
            pointerEvents="visibleStroke"
            strokeDasharray={arrow.dashed ? "2,2" : undefined}
            markerEnd={`url(#arrowhead-${arrow.stroke})`}
            className={className}
            onMouseEnter={(e) => onHover(relatedThrow, e)}
            onMouseMove={(e) => onHover(relatedThrow, e)}
            onMouseLeave={onLeave}
        />
    )
}

function HandDot({
    dot,
    onHover,
    onLeave,
}: {
    dot: DotSpec
    onHover: (e: MouseEv) => void
    onLeave: () => void
}) {
    return (
        <g>
            <circle cx={dot.cx} cy={dot.cy} r={2} fill={dot.fill} className="dot" />
            <circle
                cx={dot.cx}
                cy={dot.cy}
                r={7}
                fill="transparent"
                className="dot-hit"
                onMouseEnter={onHover}
                onMouseMove={onHover}
                onMouseLeave={onLeave}
            />
        </g>
    )
}

function LabelText({ text }: { text: TextSpec }) {
    return (
        <text
            x={text.x}
            y={text.y}
            fill={text.fill}
            dominantBaseline="hanging"
            className={`label label-${text.kind}`}
        >
            {text.text}
        </text>
    )
}

function ThrowLabel({
    throwSpec,
    hovered,
    dimmed,
    onHover,
    onLeave,
}: {
    throwSpec: ThrowSpec
    hovered: boolean
    dimmed: boolean
    onHover: (e: MouseEv) => void
    onLeave: () => void
}) {
    const className = ["throw-label", hovered && "hovered", dimmed && "dim"]
        .filter(Boolean)
        .join(" ")
    return (
        <text
            x={throwSpec.x}
            y={throwSpec.y}
            fill={throwSpec.fill}
            dominantBaseline="hanging"
            className={className}
            onMouseEnter={onHover}
            onMouseMove={onHover}
            onMouseLeave={onLeave}
        >
            {throwSpec.label}
        </text>
    )
}

function ErrorMarker({ error }: { error: ErrorSpec }) {
    return (
        <g className="error-marker">
            <circle cx={error.x} cy={error.y} r={5} fill="red" stroke="black" strokeWidth={1} />
            <text
                x={error.x + 5}
                y={error.y + 25}
                fill="red"
                fontSize={12}
                dominantBaseline="hanging"
            >
                {error.message}
            </text>
        </g>
    )
}

function Tooltip({ tooltip }: { tooltip: TooltipState }) {
    return (
        <div className="canvas-tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
            {tooltip.lines.map((line, i) => (
                <div key={i} className="canvas-tooltip-line">{line}</div>
            ))}
        </div>
    )
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
    return (
        <marker
            id={id}
            markerWidth={10}
            markerHeight={10}
            refX={3.75}
            refY={2.5}
            orient="auto-start-reverse"
            markerUnits="userSpaceOnUse"
        >
            <polygon points="0,0 3.75,2.5 0,5" fill={color} />
        </marker>
    )
}
