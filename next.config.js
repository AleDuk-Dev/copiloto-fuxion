/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensures server-only code never leaks to the client bundle
  serverExternalPackages: ['@anthropic-ai/sdk'],
}

module.exports = nextConfig
