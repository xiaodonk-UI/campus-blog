/**
 * 校园个人博客系统 - 根布局组件
 * 包裹所有页面：Ant Design 主题注册 → AuthProvider → 导航栏 → 页面内容
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import './globals.css';

/** 页面元数据 */
export const metadata: Metadata = {
  title: '校园个人博客',
  description: '分享技术、学习与校园生活的个人博客平台',
};

/** Ant Design 主题配置 */
const themeConfig = {
  token: {
    colorPrimary: '#1677ff',      // 主色调：经典蓝色
    borderRadius: 6,
    fontSize: 14,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* AntdRegistry：确保Ant Design在服务端渲染时样式正常 */}
        <AntdRegistry>
          {/* ConfigProvider：全局主题 + 中文国际化 */}
          <ConfigProvider theme={themeConfig} locale={zhCN}>
            {/* AntApp：为message/notification等静态方法提供上下文 */}
            <AntApp>
              {/* AuthProvider：全局登录状态管理 */}
              <AuthProvider>
                {/* 全局导航栏（Suspense包裹：Navbar内部使用了useSearchParams） */}
                <Suspense fallback={<div style={{ height: 56, background: '#fff', borderBottom: '1px solid #f0f0f0' }} />}>
                  <Navbar />
                </Suspense>
                {/* 页面主体 */}
                <main className="page-container">
                  {children}
                </main>
              </AuthProvider>
            </AntApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
