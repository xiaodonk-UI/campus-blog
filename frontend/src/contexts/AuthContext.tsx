'use client';

/**
 * 校园个人博客系统 - 全局登录状态管理（React Context）
 * 提供：当前用户信息、登录/注册/退出方法、loading状态
 * 包裹在根布局中，所有页面可访问
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { App } from 'antd';
import type { User, LoginParams, RegisterParams, AuthResponse } from '@/types';
import request from '@/utils/request';
import { saveAuth, clearAuth, getStoredUser, getToken } from '@/utils/auth';

// ==================== Context类型定义 ====================

interface AuthContextType {
  user: User | null;                      // 当前登录用户，null表示未登录
  loading: boolean;                        // 初始化加载状态
  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;        // 手动刷新用户信息
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider组件 ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();  // antd v6推荐用法，避免静态API警告

  /**
   * 应用初始化时：检查本地是否有Token，有则恢复登录状态
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      // 从本地恢复用户信息
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
      // 异步验证Token有效性
      try {
        const res = await request.get('/api/user/profile');
        if ((res as any).code === 200 && res.data) {
          setUser(res.data as User);
        }
      } catch {
        // Token无效，清除本地凭证
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  /**
   * 登录：调用接口 → 保存Token → 设置用户状态
   */
  const login = useCallback(async (params: LoginParams) => {
    const res = await request.post('/api/user/login', params);
    const { token, refresh_token, user: loginUser } = res.data as AuthResponse;
    saveAuth(token, refresh_token, loginUser);
    setUser(loginUser);
    message.success(`欢迎回来，${loginUser.nickname || loginUser.username}！`);
  }, []);

  /**
   * 注册：调用接口 → 检查邮箱确认 → 自动登录或提示验证
   */
  const register = useCallback(async (params: RegisterParams) => {
    const res = await request.post('/api/user/register', params);
    const { email_confirmed } = (res.data as any) || {};

    if (email_confirmed) {
      // 邮箱已验证 → 自动登录
      await login({ email: params.email, password: params.password });
      message.success('注册成功，已自动登录！');
    } else {
      // 邮箱未验证 → 跳转登录页并提示
      message.info('注册成功！请前往邮箱点击验证链接，然后登录。');
      // 不调用 login，避免报错
    }
  }, [login]);

  /**
   * 退出登录：清除凭证 → 重置状态
   */
  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    message.info('已退出登录');
  }, []);

  /**
   * 刷新用户信息：重新从服务端获取最新用户数据
   */
  const refreshUser = useCallback(async () => {
    try {
      const res = await request.get('/api/user/profile');
      if ((res as any).code === 200 && res.data) {
        setUser(res.data as User);
      }
    } catch {
      // 静默失败
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== 自定义Hook ====================

/**
 * 在组件中获取登录状态
 * 使用示例：const { user, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}
