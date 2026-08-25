import type { NextConfig } from "next";
import os from "os";

const lanIps = Object.values(os.networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address)
);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@imgly/background-removal-node", "onnxruntime-node", "sharp"],
  allowedDevOrigins: ["127.0.0.1", ...lanIps],
  async headers() {
    return [
      {
        source: "/background-removal-1.7.0/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
