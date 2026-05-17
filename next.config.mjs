/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@blocknote/core", "@blocknote/react", "@blocknote/server-util"],

  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
