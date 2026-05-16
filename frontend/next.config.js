/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/courses", destination: "/goals", permanent: false },
      {
        source: "/courses/:course_id/ready",
        destination: "/goals/:course_id/ready",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
