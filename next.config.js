/** @type {import('next').NextConfig} */
const superAdminUrl = (process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3002').replace(/\/+$/, '');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/superadmin',
        destination: `${superAdminUrl}`,
        permanent: false,
      },
      {
        source: '/superadmin/login',
        destination: `${superAdminUrl}/login`,
        permanent: false,
      },
      {
        source: '/superadmin/:path*',
        destination: `${superAdminUrl}/:path*`,
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api')
      .replace(/\/api\/?$/, '');
    return [
      {
        source: '/storage/:path*',
        destination: `${backendUrl}/storage/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
