import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Studious",
        short_name: "Studious",
        description: "AI-powered study planning, focus tracking, and performance insights.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0a1816",
        theme_color: "#0a1816",
        icons: [
            {
                src: "/icons/studious-icon.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any maskable",
            },
        ],
    };
}
