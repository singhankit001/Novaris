import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["node_modules", ".next"],
        // next-auth imports the extensionless "next/server"; Node ESM cannot resolve it
        // because next has no exports map, so let Vite resolve it instead.
        server: { deps: { inline: ["next-auth"] } },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
