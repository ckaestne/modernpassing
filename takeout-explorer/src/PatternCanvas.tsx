import { useState } from "react"
import type {
    CrossingKind,
    DotSpec,
    ThrowSpec,
    DebugPatternLayout,
} from "../api/pattern-debug-layout.ts"
import "./PatternCanvas.css"

type TooltipState = {
    x: number
    y: number
    lines: string[]
}

function describeCrossing(crossing: CrossingKind): string {
    if (crossing === "self") return "self throw"
    if (crossing === "straight-pass") return "straight pass"
    return "cross pass"
}

function throwTooltipLines(t: ThrowSpec): string[] {
    const actionableMarkers = t.markerTooltips.filter((m) => m.category !== "other")

    const lines = [
        `From: passer ${t.fromPasserIdx} (${t.fromRole}), ${t.hand} hand, beat ${t.beat}`,
        `To: passer ${t.toPasserIdxAtThrow} (${t.toRoleAtThrow}) now; ${t.toPasserIdxOnCausal} (${t.toRoleOnCausal}) on causal beat (${t.causeBeat}); ${t.targetHandFirstIteration} hand`,
        `Duration: ${t.throwLength} beats`,
        `${describeCrossing(t.crossing)}`,
    ]

    if (actionableMarkers.length > 0) {
        for (const marker of actionableMarkers) {
            lines.push(`${marker.label}: ${marker.summary}`)
        }
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

export function PatternCanvas({ layout }: { layout: DebugPatternLayout }) {
    const { width, height, dist: _dist, texts, dots, throws, arrows, errors } = layout
    const [hoveredThrow, setHoveredThrow] = useState<string | null>(null)
    const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)

    const highlightThrowIds = new Set<string>()
    if (hoveredThrow) highlightThrowIds.add(hoveredThrow)
    if (hoveredArrow) {
        const arrow = arrows.find((a) => a.id === hoveredArrow)
        if (arrow) highlightThrowIds.add(arrow.throwId)
    }

    return (
        <div className="pattern-canvas">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                onMouseLeave={() => {
                    setHoveredArrow(null)
                    setHoveredThrow(null)
                    setTooltip(null)
                }}
            >
                <defs>
                    <ArrowMarker id="arrowhead-blue" color="blue" />
                    <ArrowMarker id="arrowhead-green" color="green" />
                </defs>

                {/* causal arrows */}
                {arrows.map((a) => {
                    const relatedThrow = throws.find((t) => t.id === a.throwId)
                    const related = highlightThrowIds.has(a.throwId)
                    const dim =
                        (hoveredThrow !== null || hoveredArrow !== null) &&
                        !related
                    const markerClass = relatedThrow
                        ? Array.from(
                            new Set(
                                relatedThrow.markerTooltips
                                    .filter((m) => m.category !== "other")
                                    .map((m) => `arrow-${m.category}`),
                            ),
                        ).join(" ")
                        : ""
                    return (
                        <path
                            key={a.id}
                            d={a.d}
                            fill="none"
                            stroke={a.stroke}
                            strokeWidth={2}
                            pointerEvents="visibleStroke"
                            strokeDasharray={a.dashed ? "2,2" : undefined}
                            markerEnd={`url(#arrowhead-${a.stroke})`}
                            className={`arrow ${markerClass} ${dim ? "dim" : ""} ${
                                hoveredArrow === a.id ? "hovered" : ""
                            }`}
                            onMouseEnter={(e) => {
                                setHoveredArrow(a.id)
                                if (relatedThrow) {
                                    setTooltip({
                                        x: e.clientX,
                                        y: e.clientY,
                                        lines: [
                                            ...throwTooltipLines(relatedThrow),                                            
                                        ],
                                    })
                                }
                            }}
                            onMouseMove={(e) => {
                                if (relatedThrow) {
                                    setTooltip({
                                        x: e.clientX,
                                        y: e.clientY,
                                        lines: [
                                            ...throwTooltipLines(relatedThrow),
                                        ],
                                    })
                                }
                            }}
                            onMouseLeave={() => {
                                setHoveredArrow(null)
                                setTooltip(null)
                            }}
                        />
                    )
                })}

                {/* small hand-position dots */}
                {dots.map((d, i) => (
                    <g key={i}>
                        <circle
                            cx={d.cx}
                            cy={d.cy}
                            r={2}
                            fill={d.fill}
                            className="dot"
                        />
                        <circle
                            cx={d.cx}
                            cy={d.cy}
                            r={7}
                            fill="transparent"
                            className="dot-hit"
                            onMouseEnter={(e) => {
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    lines: dotTooltipLines(d),
                                })
                            }}
                            onMouseMove={(e) => {
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    lines: dotTooltipLines(d),
                                })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                        />
                    </g>
                ))}

                {/* static text labels (headers, row labels, end labels) */}
                {texts.map((t, i) => (
                    <text
                        key={i}
                        x={t.x}
                        y={t.y}
                        fill={t.fill}
                        dominantBaseline="hanging"
                        className={`label label-${t.kind}`}
                    >
                        {t.text}
                    </text>
                ))}

                {/* throw labels (hoverable) */}
                {throws.map((t) => {
                    const isHover = highlightThrowIds.has(t.id)
                    const dim =
                        (hoveredThrow !== null || hoveredArrow !== null) &&
                        !isHover
                    return (
                        <text
                            key={t.id}
                            x={t.x}
                            y={t.y}
                            fill={t.fill}
                            dominantBaseline="hanging"
                            className={`throw-label ${
                                isHover ? "hovered" : ""
                            } ${dim ? "dim" : ""}`}
                            onMouseEnter={(e) => {
                                setHoveredThrow(t.id)
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    lines: throwTooltipLines(t),
                                })
                            }}
                            onMouseMove={(e) => {
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    lines: throwTooltipLines(t),
                                })
                            }}
                            onMouseLeave={() => {
                                setHoveredThrow(null)
                                setTooltip(null)
                            }}
                        >
                            {t.label}
                        </text>
                    )
                })}

                {/* error markers (red circles + message) */}
                {errors.map((err, i) => (
                    <g key={i} className="error-marker">
                        <circle
                            cx={err.x}
                            cy={err.y}
                            r={5}
                            fill="red"
                            stroke="black"
                            strokeWidth={1}
                        />
                        <text
                            x={err.x + 5}
                            y={err.y + 25}
                            fill="red"
                            fontSize={12}
                            dominantBaseline="hanging"
                        >
                            {err.message}
                        </text>
                    </g>
                ))}
            </svg>

            {tooltip && (
                <div
                    className="canvas-tooltip"
                    style={{
                        left: tooltip.x + 12,
                        top: tooltip.y + 12,
                    }}
                >
                    {tooltip.lines.map((line, i) => (
                        <div key={i} className="canvas-tooltip-line">{line}</div>
                    ))}
                </div>
            )}
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
