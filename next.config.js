/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/superadmin/employees/:id/edit',
        destination: '/superadmin/employees/edit?id=:id',
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
