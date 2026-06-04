/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "i.pravatar.cc" }
    ]
  },
  // Keep the OpenAI SDK and livekit-server-sdk as external Node modules
  // instead of bundling them with webpack. Both packages ship dual CJS/ESM
  // entry points and a few internal `require()` calls that webpack can't
  // statically resolve — bundling triggers "ReferenceError: require is
  // not defined" at runtime. Marking them external means Next.js resolves
  // them from node_modules at runtime instead.
  serverExternalPackages: ["openai", "livekit-server-sdk"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  }
};

export default nextConfig;
