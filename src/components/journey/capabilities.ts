export type RenderMode = "3d" | "svg";

export interface DeviceInfo {
    width: number;
    cores: number | undefined;
    memoryGb: number | undefined;
}

/** Small viewport, few cores or little memory: lower DPR cap, fewer particles, simpler materials. */
export function isLowPower({ width, cores, memoryGb }: DeviceInfo): boolean {
    return width < 768 || (cores !== undefined && cores <= 4) || (memoryGb !== undefined && memoryGb <= 4);
}

export function readDeviceInfo(): DeviceInfo {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return { width: window.innerWidth, cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory };
}

/** True when a WebGL context can be created. The probe context is released immediately. */
export function hasWebGL(): boolean {
    try {
        const canvas = document.createElement("canvas");
        const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
        if (!gl) return false;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return true;
    } catch {
        return false;
    }
}

export function prefersReducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
