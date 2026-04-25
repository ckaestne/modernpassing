import { useEffect, useRef, useState } from "react"
import type { DebugPatternLayout } from "../../vizsiteswap/rendering-svg/pattern-debug-layout.ts"
import { PatternCanvas } from "./PatternCanvas.tsx"
import { NotationReference } from "./NotationReference.tsx"
import {
    PRESET_PATTERNS,
    type PatternType,
    type PresetPattern,
} from "./patternPresets.ts"

type RenderResult = {
    valid: boolean
    error: string
    plain: DebugPatternLayout | null
    manipulator: DebugPatternLayout | null
    filled: DebugPatternLayout | null
    rendered: string
    js: string
}

const emptyResult: RenderResult = {
    valid: false,
    error: "",
    plain: null,
    manipulator: null,
    filled: null,
    rendered: "",
    js: "",
}

const DEBOUNCE_MS = 400

const PLAIN_HINT =
    "Notation: throw height, target role at throw, X/‖ for straight/crossing passes, " +
    "row of receiver at causal, target hand (in first iteration), optional manipulator " +
    "annotations (I, C, S); blue is right hand, green is left hand; arrow color indicates the hand at receiver."

// --- small components ---

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="box">
            {title && <h2 className="subtitle">{title}</h2>}
            {children}
        </div>
    )
}

function ErrorCard({ message }: { message: string }) {
    return (
        <div className="notification is-danger is-light">
            <strong>Request failed:</strong> {message}
        </div>
    )
}

function PatternInput({
    content,
    patternType,
    onContentChange,
    onTypeChange,
    onLoadPreset,
}: {
    content: string
    patternType: PatternType
    onContentChange: (v: string) => void
    onTypeChange: (v: PatternType) => void
    onLoadPreset: (preset: PresetPattern) => void
}) {
    const [notationOpen, setNotationOpen] = useState(false)

    const options: { value: PatternType; label: string }[] = [
        { value: "sync", label: "Synchronous" },
        { value: "fourHanded", label: "Four-handed" },
    ]
    return (
        <div className="box">
            <div className="field">
                <div className="dropdown is-hoverable">
                    <div className="dropdown-trigger">
                        <button type="button" className="button">
                            <span>Load pattern</span>
                        </button>
                    </div>
                    <div className="dropdown-menu" role="menu">
                        <div className="dropdown-content">
                            {PRESET_PATTERNS.map((preset) => (
                                <button
                                    key={preset.name + preset.patternType + preset.pattern.slice(0, 24)}
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => onLoadPreset(preset)}
                                >{preset.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="field">
                <label className="label">Type</label>
                <div className="control">
                    {options.map(({ value, label }) => (
                        <label key={value} className="radio mr-4">
                            <input
                                type="radio"
                                name="patternType"
                                value={value}
                                checked={patternType === value}
                                onChange={() => onTypeChange(value)}
                                className="mr-1"
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>
            <div className="field">
                <label className="label" htmlFor="content">Pattern</label>
                <div className="control">
                    <textarea
                        id="content"
                        className="textarea is-family-monospace"
                        rows={10}
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                    />
                </div>
            </div>
            <details open={notationOpen} onToggle={(e) => setNotationOpen((e.target as HTMLDetailsElement).open)}>
                <summary className="has-text-link is-clickable">Notation reference</summary>
                <NotationReference />
            </details>
        </div>
    )
}

function RenderedAnimation({ svg, js }: { svg: string; js: string }) {
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!ref.current || !js) return
        try {
            new Function(js)()
        } catch (err) {
            console.error("Animation script error:", err)
        }
    }, [svg, js])

    return (
        <Card title="Animation">
            <div
                ref={ref}
                className="svg-container"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        </Card>
    )
}

function DebugCard({ title, layout, hint }: { title: string; layout: DebugPatternLayout; hint?: string }) {
    return (
        <Card title={title}>
            <PatternCanvas layout={layout} />
            {hint && <p className="help mt-2">{hint}</p>}
        </Card>
    )
}

// --- main app ---

export default function App() {
    const [content, setContent] = useState("")
    const [patternType, setPatternType] = useState<PatternType>("sync")
    const [result, setResult] = useState<RenderResult>(emptyResult)
    const [loading, setLoading] = useState(false)
    const [requestError, setRequestError] = useState("")

    useEffect(() => {
        if (!content.trim()) {
            setResult(emptyResult)
            setRequestError("")
            return
        }
        const timer = setTimeout(async () => {
            setLoading(true)
            setRequestError("")
            try {
                const res = await fetch("/api/render", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content, patternType }),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                setResult(await res.json())
            } catch (err) {
                setRequestError(err instanceof Error ? err.message : String(err))
                setResult(emptyResult)
            } finally {
                setLoading(false)
            }
        }, DEBOUNCE_MS)
        return () => clearTimeout(timer)
    }, [content, patternType])

    return (
        <div className="section">
        <div className="container">
            <h1 className="title">Takeout Explorer</h1>

            <PatternInput
                content={content}
                patternType={patternType}
                onContentChange={setContent}
                onTypeChange={setPatternType}
                onLoadPreset={(preset) => {
                    setContent(preset.pattern)
                    setPatternType(preset.patternType)
                }}
            />

            {requestError && <ErrorCard message={requestError} />}
            {loading && <div className="spinner" />}

            {result.rendered && (
                <RenderedAnimation key={result.rendered + result.js} svg={result.rendered} js={result.js} />
            )}

            <hr />

            {result.plain && <DebugCard title="Plain" layout={result.plain} hint={PLAIN_HINT} />}
            {result.manipulator && <DebugCard title="Manipulator applied" layout={result.manipulator} />}
            {result.filled && <DebugCard title="Filled" layout={result.filled} />}

            {(result.error || result.js) && (
                <Card>
                    {result.error && <pre className="has-background-light p-3">{result.error}</pre>}
                    {result.js && <pre className="has-background-light p-3">{result.js}</pre>}
                </Card>
            )}
        </div>
        </div>
    )
}
