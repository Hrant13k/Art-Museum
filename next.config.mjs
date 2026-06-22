/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully self-contained static export — no server, no backend required.
  output: 'export',
  reactStrictMode: true,
  images: {
    // Static export cannot use the default Image Optimization server.
    // Remote museum images are served as-is and cached by the service worker.
    unoptimized: true,
  },
  // Trailing slashes make static hosting (and file:// previews) more reliable.
  trailingSlash: true,
};

export default nextConfig;
