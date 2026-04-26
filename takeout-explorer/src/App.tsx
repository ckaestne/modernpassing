import { useEffect, useRef, useState } from "react"
import type { DebugPatternLayout } from "../api/pattern-debug-layout.ts"
import { PatternCanvas } from "./PatternCanvas.tsx"
import { NotationReference } from "./NotationReference.tsx"
import {
    PRESET_PATTERNS,
    type PatternType,
    type PresetPattern,
} from "./patternPresets.ts"

type RuntimeInitData = {
    animations?: unknown
    tabs?: unknown[]
}

type RenderResult = {
    valid: boolean
    error: string
    plain: DebugPatternLayout | null
    manipulator: DebugPatternLayout | null
    filled: DebugPatternLayout | null
    rendered: string
    initData: RuntimeInitData
}

const emptyResult: RenderResult = {
    valid: false,
    error: "",
    plain: null,
    manipulator: null,
    filled: null,
    rendered: "",
    initData: {},
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

function buildExportSnippet(svg: string, initData: RuntimeInitData): string {
    const initJson = JSON.stringify(initData)
    return `<!-- Dependencies (load once per page) -->
<link rel="stylesheet" href="svgstyle.css">
<script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.4/dist/svg.min.js"></script>
<script src="animations.js"></script>

<!-- Pattern animation -->
${svg}
<script>
window.addEventListener("load", function () {
    initializeFromData(${initJson});
});
</script>
`
}

function RenderedAnimation({ svg, initData }: { svg: string; initData: RuntimeInitData }) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [exportOpen, setExportOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!ref.current || !initData.animations) return
        try {
            const init = (globalThis as { initializeFromData?: (data: RuntimeInitData) => unknown }).initializeFromData
            if (!init) {
                console.error("initializeFromData is not available")
                return
            }
            init(initData)
        } catch (err) {
            console.error("Animation init error:", err)
        }
    }, [svg, initData])

    const exportSnippet = buildExportSnippet(svg, initData)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportSnippet)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Copy failed:", err)
        }
    }

    return (
        <div className="box">
            <div className="is-flex is-justify-content-space-between is-align-items-center mb-3">
                <h2 className="subtitle mb-0">Animation</h2>
                <button
                    type="button"
                    className="button is-small"
                    onClick={() => setExportOpen((v) => !v)}
                    aria-expanded={exportOpen}
                >
                    {exportOpen ? "Hide export" : "Export"}
                </button>
            </div>
            <div
                ref={ref}
                className="svg-container"
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {exportOpen && (
                <div className="mt-4">
                    <p className="help mb-2">
                        Paste this snippet into a web page to embed the animation.
                        The page also needs <code>svgstyle.css</code> (from{" "}
                        <code>.mdbook/svgstyle.css</code>) and{" "}
                        <code>animations.js</code> (the runtime served at{" "}
                        <code>/animations.js</code>); the snippet references both.
                    </p>
                    <div className="is-flex is-justify-content-flex-end mb-2">
                        <button
                            type="button"
                            className="button is-small is-link"
                            onClick={handleCopy}
                        >
                            {copied ? "Copied!" : "Copy to clipboard"}
                        </button>
                    </div>
                    <pre
                        className="has-background-light p-3"
                        style={{ maxHeight: "400px", overflow: "auto" }}
                    >
                        <code>{exportSnippet}</code>
                    </pre>
                </div>
            )}
        </div>
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

    const hasAnimationData = Boolean(result.initData.animations)
    const hasInitData = hasAnimationData || ((result.initData.tabs?.length ?? 0) > 0)

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
                <RenderedAnimation key={result.rendered + JSON.stringify(result.initData)} svg={result.rendered} initData={result.initData} />
            )}

            <hr />

            {result.plain && <DebugCard title="Plain" layout={result.plain} hint={PLAIN_HINT} />}
            {result.manipulator && <DebugCard title="Manipulator applied" layout={result.manipulator} />}
            {result.filled && <DebugCard title="Filled" layout={result.filled} />}

            {(result.error || hasInitData) && (
                <Card>
                    {result.error && <pre className="has-background-light p-3">{result.error}</pre>}
                    {hasInitData && <pre className="has-background-light p-3">{JSON.stringify(result.initData, null, 2)}</pre>}
                </Card>
            )}
        </div>
        </div>
    )
}
