import type { SceneModel } from "./model";
import s from "./journey.module.css";

interface SvgWorldProps {
    model: SceneModel | null;
    /** Reduced motion: composed static frame, nothing moves. */
    still: boolean;
    commitsReady: boolean;
}

const CX = 500;
const CY = 320;

/** Project the 3D layout into the 1000x640 frame: depth shrinks and pulls toward the centre. */
function project(pos: [number, number, number]): { x: number; y: number; k: number } {
    const depth = Math.min(1, Math.abs(pos[2]) / 20);
    const k = 1 - depth * 0.45;
    return { x: CX + pos[0] * 62 * k, y: CY + pos[1] * 58 * k, k };
}

/** Elegant 2D version of the constellation with the same palette and structure as the WebGL world. */
export function SvgWorld({ model, still, commitsReady }: SvgWorldProps) {
    const nodes = model?.nodes.map((nd) => ({ nd, p: project(nd.pos) })) ?? [];
    return (
        <div className={`${s.svgWorld} ${still ? s.staticWorld : ""}`} aria-hidden="true">
            <svg viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" focusable="false">
                <defs>
                    <linearGradient id="nvj-signal" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#2f54ff" />
                        <stop offset="0.55" stopColor="#7a4dff" />
                        <stop offset="1" stopColor="#19b6e6" />
                    </linearGradient>
                    <radialGradient id="nvj-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0" stopColor="#dfe5ff" stopOpacity="0.95" />
                        <stop offset="0.6" stopColor="#efe6ff" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#fafaf7" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="nvj-silver" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="1" stopColor="#dfe3ee" />
                    </linearGradient>
                </defs>
                <circle cx={CX} cy={CY} r="330" fill="url(#nvj-glow)" />
                <g className={s.ringSpin}>
                    <circle cx={CX} cy={CY} r="290" fill="none" stroke="url(#nvj-signal)" strokeWidth="2" strokeDasharray="620 1200" strokeLinecap="round" opacity="0.8" />
                    <circle cx={CX} cy={CY} r="250" fill="none" stroke="#c9d4ff" strokeWidth="1" />
                </g>
                <g className={s.ringSpinRev}>
                    <circle cx={CX} cy={CY} r="215" fill="none" stroke="url(#nvj-signal)" strokeWidth="1.25" strokeDasharray="260 800" strokeLinecap="round" opacity="0.7" />
                    <circle cx={CX} cy={CY} r="175" fill="none" stroke="#e3d4ff" strokeWidth="1" />
                </g>

                {model?.links.map((l, i) => {
                    const a = l.from < 0 ? { x: CX, y: CY } : nodes[l.from]?.p;
                    const b = nodes[l.to]?.p;
                    if (!a || !b) return null;
                    const mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.14;
                    const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.14;
                    const d = `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
                    const color = nodes[l.to]?.nd.color ?? "#2f54ff";
                    return (
                        <g key={`${l.from}-${l.to}`}>
                            <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={l.kind === "core" ? 1.4 : 1} opacity={l.kind === "core" ? 0.55 : 0.4} className={s.pathDraw} style={{ animationDelay: `${i * 70}ms` }} />
                            <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" className={s.flow} />
                        </g>
                    );
                })}

                <g className={s.corePulse}>
                    <polygon points="500,256 560,290 560,350 500,384 440,350 440,290" fill="url(#nvj-silver)" stroke="#2f54ff" strokeWidth="1.5" />
                    <polygon points="500,286 530,303 530,337 500,354 470,337 470,303" fill="#e7ddff" stroke="#7a4dff" strokeWidth="1.25" />
                    <circle cx={CX} cy={CY} r="86" fill="none" stroke="#2f54ff" strokeWidth="1" opacity="0.3" />
                </g>

                {nodes.map(({ nd, p }, i) => {
                    const r = (14 + nd.weight * 22) * p.k;
                    const pts = Array.from({ length: 6 }, (_, k) => {
                        const a = (Math.PI / 3) * k + Math.PI / 6;
                        return `${(p.x + Math.cos(a) * r).toFixed(1)},${(p.y + Math.sin(a) * r).toFixed(1)}`;
                    }).join(" ");
                    return (
                        <g key={nd.id} className={s.nodeIn} style={{ animationDelay: `${120 + i * 60}ms` }}>
                            <polygon points={pts} fill="url(#nvj-silver)" stroke={nd.color} strokeWidth="1.6" />
                            <circle cx={p.x} cy={p.y} r={r * 0.38} fill={nd.color} opacity="0.35" />
                            {commitsReady && model?.commits.includes(i) && <circle cx={p.x + r + 7} cy={p.y - r * 0.4} r="3" fill="#19b6e6" />}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
