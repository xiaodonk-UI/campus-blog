'use client';

/**
 * 校园个人博客系统 - 登录拦截组件
 * 包裹需要登录才能访问的页面/操作
 * 未登录时自动跳转到登录页，登录后显示子组件
 */
import React, { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  /** 跳转登录页时携带的提示信息 */
  tip?: string;
}

export default function AuthGuard({ children, tip = '请先登录后再进行操作' }: AuthGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // 未登录 → 跳转登录页，并携带来源路径方便登录后跳回
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}&tip=${encodeURIComponent(tip)}`);
    }
  }, [user, loading, router, tip]);

  // 加载中显示Spin
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录（正在跳转中）显示空白
  if (!user) {
    return null;
  }

  // 已登录，渲染子组件
  return <>{children}</>;
}
