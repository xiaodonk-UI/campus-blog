'use client';

/**
 * 校园个人博客系统 - 注册页面
 * 功能：表单校验、检查用户名/邮箱格式、注册后自动登录并跳转首页
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Form, Input, Button, message, Typography, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import type { RegisterParams } from '@/types';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 已登录直接跳转首页
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  /** 处理注册提交 */
  const handleSubmit = async (values: RegisterParams) => {
    setLoading(true);
    try {
      // 过滤掉确认密码字段（后端不需要）
      const { confirmPassword, ...registerData } = values as RegisterParams & { confirmPassword?: string };
      await register(registerData);
      message.success('注册成功，正在跳转...');
      router.replace('/');
    } catch (err: any) {
      // 优先提取后端返回的具体错误信息（藏在Axios error.response.data.msg里）
      const backendMsg = err?.response?.data?.msg;
      const errMsg = backendMsg || err?.message || '注册失败，请检查网络或后端服务';
      console.error('注册失败:', errMsg);
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
          <Title level={3} style={{ marginBottom: 4 }}>创建账号</Title>
          <Text type="secondary">加入校园博客，分享你的精彩</Text>
        </div>

        <Form form={form} onFinish={handleSubmit} layout="vertical" size="large"
          initialValues={{ username: '', email: '', password: '', confirmPassword: '', nickname: '' }}
        >
          {/* 用户名 */}
          <Form.Item name="username" label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名不超过20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="3-20位字母数字下划线" />
          </Form.Item>

          {/* 邮箱 */}
          <Form.Item name="email" label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入邮箱地址" />
          </Form.Item>

          {/* 昵称（可选） */}
          <Form.Item name="nickname" label="昵称（可选）"
            rules={[{ max: 20, message: '昵称不超过20个字符' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="给自己起个好听的名字" />
          </Form.Item>

          {/* 密码 */}
          <Form.Item name="password" label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="至少6个字符" />
          </Form.Item>

          {/* 确认密码 */}
          <Form.Item name="confirmPassword" label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ fontSize: 13, color: '#999' }} />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">已有账号？</Text>
          <Link href="/login" style={{ marginLeft: 4 }}>立即登录</Link>
        </div>
      </Card>
    </div>
  );
}
