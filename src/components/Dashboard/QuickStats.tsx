"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Search, Activity, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function QuickStats() {
    const [statsData, setStatsData] = useState({
        reposScanned: 0,
        issuesFound: 0,
        deepScans: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const data = await res.json();
                if (data.stats) {
                    setStatsData(data.stats);
                }
            } catch (err) {
                console.error("Failed to fetch stats:", err);
                toast.error("Failed to load quick stats");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { label: "Repos Scanned", value: statsData.reposScanned.toString(), icon: Search, color: "text-blue-400", bg: "bg-blue-400" },
        { label: "Issues Found", value: statsData.issuesFound.toString(), icon: Shield, color: "text-red-400", bg: "bg-red-400" },
        { label: "Deep Scans", value: statsData.deepScans.toString(), icon: Zap, color: "text-purple-400", bg: "bg-purple-400" },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 h-28 flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse shrink-0" />
                        <div className="space-y-1.5 mt-2">
                            <div className="w-16 h-3 bg-white/5 rounded animate-pulse" />
                            <div className="w-24 h-5 bg-white/5 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 rounded-2xl bg-zinc-900/30 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${stat.bg}/10 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <Activity className="w-4 h-4 text-zinc-700 group-hover:text-zinc-300 transition-colors" />
                    </div>
                    <div>
                        <p className="text-zinc-300 text-sm font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                </motion.div>
            ))}

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20"
            >
                <h3 className="font-semibold text-white mb-2 italic">Pro Tip</h3>
                <p className="text-zinc-200 text-sm leading-relaxed">
                    Try scanning a repo with <strong>Deep Scan</strong> enabled for better architectural insights and flowcharts.
                </p>
            </motion.div>
        </div>
    );
}
