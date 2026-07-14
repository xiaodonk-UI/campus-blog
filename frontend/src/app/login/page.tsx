'use client';

/**
 * 校园个人博客系统 - 登录页面
 * 功能：表单校验、登录状态持久化、错误提示、注册后自动跳回
 */
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Form, Input, Button, message, Typography, Divider, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import type { LoginParams } from '@/types';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 获取跳转来源和提示信息
  const redirectTo = searchParams.get('redirect') || '/';
  const tipMessage = searchParams.get('tip');

  // 如果已登录，直接跳转走
  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  /** 处理登录提交 */
  const handleSubmit = async (values: LoginParams) => {
    setLoading(true);
    try {
      await login(values);
      // 登录成功后跳转到来源页面
      router.replace(redirectTo);
    } catch (err: any) {
      // 优先提取后端返回的具体错误信息
      const backendMsg = err?.response?.data?.msg;
      const errMsg = backendMsg || err?.message || '登录失败，请检查网络或后端服务';
      console.error('登录失败:', errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 已登录不渲染表单
  if (user) return null;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
    }}>
      <Card style={{ width: '100%', maxWidth: 420, borderRadius: 12 }} variant="outlined">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>欢迎回来</Title>
          <Text type="secondary">登录你的校园博客账号</Text>
        </div>

        {/* 未登录操作提示 */}
        {tipMessage && (
          <Alert title={tipMessage} type="warning" showIcon closable style={{ marginBottom: 16 }} />
        )}

        <Form form={form} onFinish={handleSubmit} layout="vertical" size="large"
          initialValues={{ email: '', password: '' }}
        >
          {/* 邮箱 */}
          <Form.Item name="email" label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入注册邮箱" />
          </Form.Item>

          {/* 密码 */}
          <Form.Item name="password" label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ fontSize: 13, color: '#999' }} />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">还没有账号？</Text>
          <Link href="/register" style={{ marginLeft: 4 }}>立即注册</Link>
        </div>
      </Card>
    </div>
  );
}
