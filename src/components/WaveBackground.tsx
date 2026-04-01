"use client";

import { useEffect, useRef } from "react";

export function WaveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", handleResize);

        // Grid parameters matching the reference wave look
        const SEPARATION = 45;
        const AMOUNTX = 75;
        const AMOUNTY = 45;

        let count = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw solid deep base background
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, width, height);

            count += 0.02;

            const centerX = width / 2;
            const centerY = height / 1.9;

            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    const x = (ix - AMOUNTX / 2) * SEPARATION;
                    const z = (iy + 1) * 22;

                    // Compounded sine waves for organic mountain waves
                    const waveY = (Math.sin((ix + count * 10) * 0.15) * 55) + 
                                  (Math.sin((iy + count * 5) * 0.2) * 55);

                    const fov = 450;
                    const scale = fov / (fov + z);
                    
                    const projX = centerX + x * scale;
                    const projY = centerY + (waveY + 180) * scale;

                    const r = scale * 1.8;
                    const opacity = Math.min(0.5, Math.max(0, scale * 1.3 - 0.2));

                    if (projX >= 0 && projX <= width && projY >= 0 && projY <= height) {
                        ctx.beginPath();
                        ctx.arc(projX, projY, r, 0, Math.PI * 2);

                        // Visual color mapping (purple/magenta to dark purple matching screenshot)
                        const colorIntensity = (waveY + 110) / 220;
                        const redVal = Math.floor(110 + colorIntensity * 40);
                        const greenVal = Math.floor(60 + colorIntensity * 20);
                        const blueVal = Math.floor(180 + colorIntensity * 60);

                        ctx.fillStyle = `rgba(${redVal}, ${greenVal}, ${blueVal}, ${opacity})`;
                        ctx.fill();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
}
