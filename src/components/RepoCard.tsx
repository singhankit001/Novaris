"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Star, GitFork, Code } from "lucide-react";

interface RepoCardProps {
    name: string;
    owner: string;
    description?: string;
    stars?: number;
    forks?: number;
    language?: string;
}

export function RepoCard({ name, owner, description, stars, forks, language }: RepoCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 group"
        >
            <div className="relative bg-[#09090b]/55 backdrop-blur-xl border border-white/15 rounded-2xl p-5 hover:border-cyan-400/50 hover:shadow-[0_0_35px_rgba(6,182,212,0.2)] transition-all duration-300">
                {/* Gradient glow on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-25 transition duration-500" />

                <div className="relative">
                    {/* Repo name */}
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                        <Code className="w-5 h-5 text-cyan-400" />
                        {owner}/{name}
                    </h3>

                    {/* Description */}
                    {description && (
                        <p className="text-zinc-200 text-sm mb-4 line-clamp-2">{description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-zinc-300">
                        {language && (
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                {language}
                            </span>
                        )}
                        {stars !== undefined && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400" />
                                {stars}
                            </span>
                        )}
                        {forks !== undefined && (
                            <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3 text-purple-400" />
                                {forks}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <Link
                            href={`/chat?q=${owner}/${name}`}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300 text-center"
                        >
                            Analyze Repository
                        </Link>
                        <a
                            href={`https://github.com/${owner}/${name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 text-sm rounded-xl transition-all flex items-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
