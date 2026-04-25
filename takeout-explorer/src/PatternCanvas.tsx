import { useState } from "react"
import type { DebugPatternLayout } from "../../vizsiteswap/rendering-svg/pattern-debug-layout.ts"
import "./PatternCanvas.css"

export function PatternCanvas({ layout }: { layout: DebugPatternLayout }) {
    const { width, height, dist: _dist, texts, dots, throws, arrows, errors } = layout
    const [hoveredThrow, setHoveredThrow] = useState<string | null>(null)
    const [hoveredArrow, setHoveredArrow] = useState<string | null>(null)
    const [tooltip, setTooltip] = useState<{
        x: number
        y: number
        text: string
    } | null>(null)

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
                onMouseLeave={() => setTooltip(null)}
            >
                <defs>
                    <ArrowMarker id="arrowhead-blue" color="blue" />
                    <ArrowMarker id="arrowhead-green" color="green" />
                </defs>

                {/* causal arrows */}
                {arrows.map((a) => {
                    const related = highlightThrowIds.has(a.throwId)
                    const dim =
                        (hoveredThrow !== null || hoveredArrow !== null) &&
                        !related
                    return (
                        <path
                            key={a.id}
                            d={a.d}
                            fill="transparent"
                            stroke={a.stroke}
                            strokeWidth={2}
                            strokeDasharray={a.dashed ? "2,2" : undefined}
                            markerEnd={`url(#arrowhead-${a.stroke})`}
                            className={`arrow ${dim ? "dim" : ""} ${
                                hoveredArrow === a.id ? "hovered" : ""
                            }`}
                            onMouseEnter={() => setHoveredArrow(a.id)}
                            onMouseLeave={() => setHoveredArrow(null)}
                        />
                    )
                })}

                {/* small hand-position dots */}
                {dots.map((d, i) => (
                    <circle
                        key={i}
                        cx={d.cx}
                        cy={d.cy}
                        r={2}
                        fill={d.fill}
                        className="dot"
                    />
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
                                    text: `Beat ${t.beat} · row ${t.rowIdx} · ${t.hand} hand`,
                                })
                            }}
                            onMouseMove={(e) => {
                                setTooltip({
                                    x: e.clientX,
                                    y: e.clientY,
                                    text: `Beat ${t.beat} · row ${t.rowIdx} · ${t.hand} hand`,
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
                    {tooltip.text}
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
