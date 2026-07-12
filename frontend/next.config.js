/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ant Design 服务端渲染兼容配置
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/nextjs-registry'],
  // 图片域名白名单（Supabase Storage）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
