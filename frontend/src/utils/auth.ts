/**
 * 校园个人博客系统 - 登录状态管理工具
 * 负责Token和用户信息的本地存储与读取（使用localStorage持久化）
 */

import type { User } from '@/types';

// 存储键名常量
const TOKEN_KEY = 'campus_blog_token';
const REFRESH_TOKEN_KEY = 'campus_blog_refresh_token';
const USER_KEY = 'campus_blog_user';

/**
 * 保存登录凭证到本地存储
 */
export function saveAuth(token: string, refreshToken: string, user: User): void {
  if (typeof window === 'undefined') return; // SSR防护
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * 获取存储的Token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * 检查是否已登录（Token存在即认为已登录）
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 清除所有登录凭证（退出登录时调用）
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
