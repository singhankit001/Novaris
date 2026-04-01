"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, GitFork, Award, Brain, TrendingUp, Sparkles, CheckCircle2, ArrowUpRight, Cpu, Layers, Terminal, AlertTriangle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

type MetricItem = {
    name: string;
    value: number;
    color: string;
};

// Graph Node/Edge structure for EKG view
interface GraphNode {
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
    color: string;
}

interface GraphEdge {
    source: string;
    target: string;
    label: string;
}

export default function AdvancedVisuals() {
    const [activeTab, setActiveTab] = useState<"dna" | "stack" | "debt" | "graph">("dna");

    // EKG Mock Graph Dataset
    const nodes: GraphNode[] = [
        { id: "repo", label: "novaris-app", type: "repo", x: 100, y: 110, color: "#a855f7" },
        { id: "dev", label: "Marcus (Lead)", type: "developer", x: 45, y: 60, color: "#3b82f6" },
        { id: "api", label: "/api/chat", type: "api", x: 155, y: 60, color: "#ec4899" },
        { id: "func", label: "queryGraph()", type: "func", x: 100, y: 175, color: "#10b981" },
        { id: "db", label: "EKG Table", type: "db", x: 45, y: 230, color: "#f59e0b" },
        { id: "secret", label: "GEMINI_KEY", type: "secret", x: 35, y: 130, color: "#ef4444" },
        { id: "ci", label: "Actions CI", type: "ci", x: 165, y: 130, color: "#06b6d4" },
        { id: "sec", label: "CVE-2026-90", type: "sec", x: 155, y: 230, color: "#f43f5e" }
    ];

    const edges: GraphEdge[] = [
        { source: "dev", target: "repo", label: "commits" },
        { source: "api", target: "repo", label: "exposes" },
        { source: "repo", target: "func", label: "contains" },
        { source: "func", target: "db", label: "queries" },
        { source: "secret", target: "repo", label: "config" },
        { source: "ci", target: "repo", label: "deploys" },
        { source: "sec", target: "func", label: "affects" }
    ];

    // Radar metrics data
    const radarMetrics: MetricItem[] = [
        { name: "Security Posture", value: 92, color: "#ef4444" },
        { name: "Arch Maturity", value: 85, color: "#3b82f6" },
        { name: "Code Cleanliness", value: 94, color: "#10b981" },
        { name: "Documentation", value: 78, color: "#eab308" },
        { name: "Testing Coverage", value: 88, color: "#a855f7" }
    ];

    // Compute polygon coordinates for Radar Chart
    const totalPoints = radarMetrics.length;
    const center = 100;
    const radius = 68;

    const getCoordinates = (index: number, val: number) => {
        const angle = (Math.PI * 2 / totalPoints) * index - Math.PI / 2;
        const x = center + (radius * (val / 100)) * Math.cos(angle);
        const y = center + (radius * (val / 100)) * Math.sin(angle);
        return { x, y };
    };

    const backgroundLevels = [25, 50, 75, 100];
    const pointsStr = radarMetrics.map((m, i) => {
        const { x, y } = getCoordinates(i, m.value);
        return `${x},${y}`;
    }).join(" ");

    // Tech Stack items
    const techStack = [
        { name: "TypeScript", usage: 65, color: "bg-blue-500", icon: Terminal },
        { name: "React / Next.js", usage: 22, color: "bg-purple-500", icon: Cpu },
        { name: "CSS / PostCSS", usage: 8, color: "bg-pink-500", icon: Layers },
        { name: "Prisma & SQL", usage: 5, color: "bg-emerald-500", icon: GitFork }
    ];

    return (
        <div className="space-y-8">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        Developer DNA & Intel Analytics
                    </h2>
                    <p className="text-zinc-500 text-xs">A comprehensive evaluation of repository maturity, depth, and safety.</p>
                </div>
                
                {/* Advanced Framer Motion Tabs */}
                <div className="flex items-center gap-4">
                    <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl relative">
                        {(["dna", "stack", "debt", "graph"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg relative transition-all uppercase tracking-wider ${
                                    activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="active-tab"
                                        className="absolute inset-0 bg-white/10 rounded-lg border border-white/5"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{tab === "dna" ? "DNA" : tab === "stack" ? "Stack" : "Debt"}</span>
                            </button>
                        ))}
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        Novaris IQ: 91
                    </div>
                </div>
            </div>

            {/* Main Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Tab Switchable Panel */}
                <div className="lg:col-span-1 min-h-[320px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "dna" && (
                            <motion.div
                                key="dna"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="p-6 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-between"
                            >
                                <h3 className="text-sm font-semibold text-zinc-400 self-start mb-4">DNA Profile Radar</h3>
                                
                                <div className="relative w-full max-w-[180px] aspect-square flex items-center justify-center mb-4">
                                    <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                                        {backgroundLevels.map((lvl) => {
                                            const levelPoints = radarMetrics.map((_, i) => {
                                                const { x, y } = getCoordinates(i, lvl);
                                                return `${x},${y}`;
                                            }).join(" ");
                                            return (
                                                <polygon
                                                    key={lvl}
                                                    points={levelPoints}
                                                    fill="none"
                                                    stroke="rgba(255, 255, 255, 0.05)"
                                                    strokeWidth="1"
                                                />
                                            );
                                        })}

                                        {radarMetrics.map((_, i) => {
                                            const { x, y } = getCoordinates(i, 100);
                                            return (
                                                <line
                                                    key={i}
                                                    x1={center}
                                                    y1={center}
                                                    x2={x}
                                                    y2={y}
                                                    stroke="rgba(255, 255, 255, 0.07)"
                                                    strokeWidth="1"
                                                />
                                            );
                                        })}

                                        <polygon
                                            points={pointsStr}
                                            fill="rgba(168, 85, 247, 0.15)"
                                            stroke="#a855f7"
                                            strokeWidth="2"
                                        />

                                        {radarMetrics.map((m, i) => {
                                            const { x, y } = getCoordinates(i, 115);
                                            const textAnchor = x > center ? "start" : x < center ? "end" : "middle";
                                            const alignmentBaseline = y > center ? "before-edge" : y < center ? "after-edge" : "middle";
                                            return (
                                                <text
                                                    key={m.name}
                                                    x={x}
                                                    y={y}
                                                    textAnchor={textAnchor}
                                                    alignmentBaseline={alignmentBaseline}
                                                    fill="#a1a1aa"
                                                    fontSize="8"
                                                    fontWeight="600"
                                                    className="font-sans fill-zinc-400"
                                                >
                                                    {m.name}
                                                </text>
                                            );
                                        })}
                                    </svg>
                                </div>

                                <div className="w-full space-y-1.5">
                                    {radarMetrics.map((m) => (
                                        <div key={m.name} className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-500">{m.name}</span>
                                            <span className="font-semibold text-white font-mono">{m.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "stack" && (
                            <motion.div
                                key="stack"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="p-6 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                            >
                                <h3 className="text-sm font-semibold text-zinc-400 mb-4">Tech Stack Breakdown</h3>
                                <div className="space-y-6 flex-1 py-2">
                                    {techStack.map((item) => (
                                        <div key={item.name} className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 text-zinc-300">
                                                    <item.icon className="w-3.5 h-3.5 text-zinc-500" />
                                                    <span className="font-medium">{item.name}</span>
                                                </div>
                                                <span className="text-zinc-400 font-mono">{item.usage}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.usage}%` }}
                                                    transition={{ duration: 0.8 }}
                                                    className={`h-full ${item.color} rounded-full`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-4 pt-4 border-t border-white/5 text-center">
                                    Determined dynamically from packages and dependency trees.
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "debt" && (
                            <motion.div
                                key="debt"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="p-6 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                            >
                                <h3 className="text-sm font-semibold text-zinc-400 mb-4">Technical Depth Metrics</h3>
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div>
                                            <span className="text-xs text-zinc-500">Refactoring Index</span>
                                            <h4 className="text-sm font-bold text-white mt-0.5">Optimal (Low Debt)</h4>
                                        </div>
                                        <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">98%</div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div>
                                            <span className="text-xs text-zinc-500">Duplication Density</span>
                                            <h4 className="text-sm font-bold text-white mt-0.5">Very Low Duplication</h4>
                                        </div>
                                        <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">2.1%</div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div>
                                            <span className="text-xs text-zinc-500">Dependency Risk</span>
                                            <h4 className="text-sm font-bold text-white mt-0.5">Minimal (Up-to-date)</h4>
                                        </div>
                                        <div className="text-xs font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Clean</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-4 pt-4 border-t border-white/5 text-center flex items-center justify-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    No code health alerts raised.
                                </div>
                            </motion.div>
                        )}

                        {activeTab === "graph" && (
                            <motion.div
                                key="graph"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="p-6 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between h-[360px]"
                            >
                                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Live EKG Knowledge Graph</h3>
                                <div className="relative flex-1 bg-black/20 border border-white/5 rounded-xl overflow-hidden min-h-[220px]">
                                    <svg viewBox="0 0 200 240" className="w-full h-full">
                                        {/* Pulse Data Streams (Edges) */}
                                        {edges.map((e, idx) => {
                                            const n1 = nodes.find(n => n.id === e.source);
                                            const n2 = nodes.find(n => n.id === e.target);
                                            if (!n1 || !n2) return null;
                                            return (
                                                <g key={idx}>
                                                    <line
                                                        x1={n1.x}
                                                        y1={n1.y}
                                                        x2={n2.x}
                                                        y2={n2.y}
                                                        stroke="rgba(255, 255, 255, 0.08)"
                                                        strokeWidth="1.5"
                                                    />
                                                    <line
                                                        x1={n1.x}
                                                        y1={n1.y}
                                                        x2={n2.x}
                                                        y2={n2.y}
                                                        stroke={n1.color}
                                                        strokeWidth="1.5"
                                                        strokeDasharray="5,15"
                                                        className="animate-edge-flow"
                                                        opacity="0.75"
                                                    />
                                                </g>
                                            );
                                        })}

                                        {/* Breathing Nodes */}
                                        {nodes.map((n) => (
                                            <g key={n.id}>
                                                <motion.circle
                                                    cx={n.x}
                                                    cy={n.y}
                                                    r="8"
                                                    fill={n.color}
                                                    opacity="0.15"
                                                    animate={{ scale: [1, 1.4, 1] }}
                                                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: Math.random() * 2 }}
                                                />
                                                <circle
                                                    cx={n.x}
                                                    cy={n.y}
                                                    r="4.5"
                                                    fill={n.color}
                                                />
                                                <text
                                                    x={n.x}
                                                    y={n.y + 14}
                                                    textAnchor="middle"
                                                    fill="#a1a1aa"
                                                    fontSize="6.5"
                                                    fontWeight="bold"
                                                    className="font-sans fill-zinc-400 select-none pointer-events-none"
                                                >
                                                    {n.label}
                                                </text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                                <div className="text-[10px] text-zinc-500 mt-3 pt-3 border-t border-white/5 text-center flex items-center justify-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    <span>Real-time AST call flow mapping is active.</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. Score Cards and Health Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
                    {/* Security Maturity Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between h-[150px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                                <Shield className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 uppercase tracking-widest border border-red-500/20">Secure</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-zinc-500 text-xs font-medium">Security Posture Rating</p>
                            <p className="text-2xl font-bold text-white tracking-tight">A+ High Grade</p>
                            <p className="text-zinc-400 text-xs mt-0.5">0 Exposed Secrets detected recently.</p>
                        </div>
                    </motion.div>

                    {/* Architecture Integrity Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between h-[150px]"
                    >
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                <GitFork className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase tracking-widest border border-blue-500/20">Cohesive</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-zinc-500 text-xs font-medium">Architecture Cohesion</p>
                            <p className="text-2xl font-bold text-white tracking-tight">88% Maturity</p>
                            <p className="text-zinc-400 text-xs mt-0.5">High coupling efficiency observed.</p>
                        </div>
                    </motion.div>

                    {/* Technical Debt Insights */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between col-span-1 md:col-span-2"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Award className="w-4.5 h-4.5 text-yellow-500" />
                                <span className="text-sm font-semibold text-zinc-300">Technical Depth Insight</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">Debt Ratio: 3.4%</div>
                        </div>
                        <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div>
                                <p className="text-white text-sm font-medium">Excellent module decoupling</p>
                                <p className="text-zinc-500 text-xs mt-0.5">Circular dependencies are extremely low. Clean component relationships.</p>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Optimal Health
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* 3. Open Source Impact & Learning Velocity panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Learning Velocity Progress */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-zinc-300">Learning & Tech Velocity</h4>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                                <span>Framework Adaptability</span>
                                <span>94%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: "94%" }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-purple-500"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                                <span>Legacy Code Reduction</span>
                                <span>80%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: "80%" }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                                    className="h-full bg-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Open Source Contribution Panel */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col justify-between"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-zinc-300">Production Readiness Index</h4>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest bg-zinc-800/80 px-2 py-0.5 border border-white/5 rounded">Beta</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold">96% Deployment Score</p>
                            <p className="text-zinc-500 text-xs">Your workspace features are optimized for stable cloud integrations.</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-zinc-500">
                        <span>Latest release check: 100% green</span>
                        <Link href="/trending" className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
                            Explore <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
