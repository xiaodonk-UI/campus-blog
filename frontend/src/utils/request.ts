/**
 * 校园个人博客系统 - Axios请求统一封装
 * 功能：自动携带Token、401未登录跳转、全局错误提示
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, clearAuth } from './auth';

/** 简易提示（不依赖antd，避免SSR/版本警告） */
const toast = (msg: string) => { console.error("[API]", msg); };

/** 后端API基础地址 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (typeof window === 'undefined' ? 'http://localhost:5000' : '');

/** 创建Axios实例，统一配置 */
const request = axios.create({
  baseURL: API_BASE,
  timeout: 30000,                        // 30秒超时（Supabase冷启动较慢）
  headers: { 'Content-Type': 'application/json' },
});


/**
 * 请求拦截器：自动在请求头中添加Authorization Token
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器：统一处理响应和错误
 */
request.interceptors.response.use(
  (response) => {
    // 后端统一返回 {code, msg, data}
    const res = response.data;
    // code为200或201视为成功，直接返回
    if (res.code === 200 || res.code === 201) {
      return res;
    }
    // 业务错误：显示错误提示
    console.error(res.msg || '请求失败');
    return Promise.reject(new Error(res.msg || '请求失败'));
  },
  (error: AxiosError<{ code?: number; msg?: string }>) => {
    const config = error.config as any;
    // 超时自动重试（最多2次，每次超时翻倍）
    const retryCount = config._retryCount || 0;
    if ((error.code === 'ECONNABORTED' || !error.response) && retryCount < 2) {
      config._retryCount = retryCount + 1;
      config.timeout = (config.timeout || 15000) * 1.5; // 翻倍超时
      console.warn(`[重试 ${retryCount + 1}/2] ${config.url} (timeout=${config.timeout}ms)`);
      return new Promise(resolve => setTimeout(resolve, 800)).then(() => request(config));
    }

    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        clearAuth();
        setTimeout(() => { window.location.href = '/login'; }, 1000);
      } else {
        console.error(data?.msg || `请求异常 (${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('请求超时，请检查网络');
    } else {
      console.error('网络连接异常', error.message);
    }
    return Promise.reject(error);
  }
);

export default request;
