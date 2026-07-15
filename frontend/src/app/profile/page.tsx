'use client';

/**
 * 校园个人博客系统 - 个人中心页面
 * 功能：查看/编辑个人信息、更换头像、查看我的文章列表
 * 需要登录才能访问
 */
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card, Form, Input, Button, Avatar, Tabs, Typography, Space, App,
  Upload, Spin, Empty, Alert, Skeleton, Pagination, Divider, Popconfirm,
} from 'antd';
import {
  UserOutlined, EditOutlined, CameraOutlined, LogoutOutlined,
  DeleteOutlined, EyeOutlined, PlusOutlined, SaveOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import type { Article, PaginatedData } from '@/types';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}>
      <AuthGuard tip="请先登录后查看个人中心">
        <ProfileContent />
      </AuthGuard>
    </Suspense>
  );
}

/** 个人中心主体内容 */
function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  if (!user) return null;

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>个人中心</Typography.Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab}
        items={[
          {
            key: 'profile',
            label: '个人信息',
            children: <ProfileForm user={user} onRefresh={refreshUser} onLogout={logout} />,
          },
          {
            key: 'articles',
            label: '我的文章',
            children: <MyArticlesTab userId={user.id} />,
          },
        ]}
      />
    </div>
  );
}

// ==================== 个人信息编辑面板 ====================

interface ProfileFormProps {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
}

function ProfileForm({ user, onRefresh, onLogout }: ProfileFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      nickname: user.nickname || '',
      bio: user.bio || '',
    });
  }, [user, form]);

  /** 保存个人信息 */
  const handleSave = useCallback(async (values: { nickname: string; bio: string }) => {
    setSaving(true);
    try {
      await request.put('/api/user/profile', values);
      message.success('个人信息更新成功');
      await onRefresh();
    } catch { /* 错误由拦截器处理 */ }
    finally { setSaving(false); }
  }, [onRefresh]);

  /** 头像上传：手动用request发FormData，绕过antd Upload的action */
  const handleAvatar = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { message.error('只能上传图片文件！'); return; }
    if (file.size > 2 * 1024 * 1024) { message.error('图片大小不能超过2MB！'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      await request.post('/api/user/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 });
      message.success('头像更新成功');
      onRefresh();
    } catch { /* 由拦截器处理 */ }
  }, [onRefresh]);

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: (file) => { handleAvatar(file); return false; },
  };

  return (
    <Card style={{ borderRadius: 12, maxWidth: 600 }}>
      {/* 头像区域 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar src={user.avatar_url} icon={<UserOutlined />} size={80}
            style={{ backgroundColor: '#1677ff' }}
          />
          <Upload {...uploadProps}>
            <Button
              shape="circle"
              size="small"
              icon={<CameraOutlined />}
              style={{ position: 'absolute', bottom: 0, right: -4 }}
            />
          </Upload>
        </div>
        <div style={{ marginTop: 8 }}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {user.nickname || user.username}
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">@{user.username}</Typography.Text>
        </div>
      </div>

      <Divider />

      {/* 信息编辑表单 */}
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item label="用户名" >
          <Input value={user.username} disabled />
        </Form.Item>

        <Form.Item name="nickname" label="昵称"
          rules={[
            { max: 50, message: '昵称不超过50个字符' },
          ]}
        >
          <Input placeholder="设置你的昵称" />
        </Form.Item>

        <Form.Item name="bio" label="个人简介"
          rules={[{ max: 500, message: '简介不超过500个字符' }]}
        >
          <Input.TextArea rows={3} placeholder="介绍一下自己..." showCount maxLength={500} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              保存修改
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={onLogout}>退出登录</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}

// ==================== 我的文章列表面板 ====================

interface MyArticlesTabProps {
  userId: string;
}

function MyArticlesTab({ userId }: MyArticlesTabProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyArticles = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await request.get('/api/articles', {
        params: { page: p, page_size: 10, author_id: userId, status: 'published' }
      });
      const data = res.data as PaginatedData<Article>;
      setArticles(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setError('加载文章失败');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyArticles(page);
  }, [page, fetchMyArticles]);

  /** 删除文章 */
  const handleDelete = async (articleId: string) => {
    try {
      await request.delete(`/api/articles/${articleId}`);
      message.success('文章已删除');
      fetchMyArticles(page);
    } catch { /* 错误由拦截器处理 */ }
  };

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>我的文章（{total}篇）</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/article/new')}>
          写新文章
        </Button>
      </div>

      {error ? (
        <Alert title={error} type="error" showIcon action={<Button onClick={() => fetchMyArticles(page)}>重试</Button>} />
      ) : loading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} active paragraph={{ rows: 2 }} style={{ marginBottom: 12 }} />)
      ) : articles.length === 0 ? (
        <Empty description="还没有发布过文章">
          <Button type="primary" onClick={() => router.push('/article/new')}>去写第一篇</Button>
        </Empty>
      ) : (
        <>
          {articles.map((article) => (
            <Card key={article.id} size="small" hoverable style={{ marginBottom: 12 }}
              onClick={() => router.push(`/article/${article.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <Typography.Text strong ellipsis style={{ fontSize: 15 }}>
                    {article.title}
                  </Typography.Text>
                  <div>
                    <Space size={16}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        <EyeOutlined /> {article.view_count}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        💬 {article.comment_count}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        ❤️ {article.like_count}
                      </Typography.Text>
                    </Space>
                  </div>
                </div>
                <Space>
                  <Button size="small" icon={<EditOutlined />}
                    onClick={(e) => { e.stopPropagation(); router.push(`/article/edit/${article.id}`); }}>
                    编辑
                  </Button>
                  <Popconfirm title="确定删除？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(article.id); }}
                    onCancel={(e) => e?.stopPropagation()} okText="确定" cancelText="取消">
                    <Button size="small" danger icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}>删除</Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))}

          {total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination current={page} total={total} pageSize={10}
                onChange={(p) => { setPage(p); }} size="small" showSizeChanger={false} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
