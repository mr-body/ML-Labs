import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    // Estes modelos usam exclusivamente o runtime "tfjs"; os adaptadores
    // MediaPipe não são executados e precisam de stubs para o Turbopack.
    resolveAlias: {
      "@mediapipe/hands": "./src/stubs/mediapipe-hands.ts",
      "@mediapipe/face_mesh": "./src/stubs/mediapipe-face-mesh.ts",
      "@mediapipe/pose": "./src/stubs/mediapipe-pose.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/hands": path.resolve(__dirname, "src/stubs/mediapipe-hands.ts"),
      "@mediapipe/face_mesh": path.resolve(__dirname, "src/stubs/mediapipe-face-mesh.ts"),
      "@mediapipe/pose": path.resolve(__dirname, "src/stubs/mediapipe-pose.ts"),
    };
    return config;
  },
};

export default nextConfig;
