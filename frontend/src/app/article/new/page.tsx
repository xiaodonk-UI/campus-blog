'use client';

/**
 * 校园个人博客系统 - 文章发布页面
 * 功能：富文本编辑器、分类选择、自定义标签、草稿保存、表单校验
 * 需要登录才能访问
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Form, Input, Select, Button, App, Space, Typography } from 'antd';
import { SaveOutlined, SendOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';
import request from '@/utils/request';
import type { Category, ArticleFormData } from '@/types';

const { Title } = Typography;

// 富文本编辑器按需加载（避免SSR问题）
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: 400, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载编辑器中...</div>,
});

export default function NewArticlePage() {
  return (
    <AuthGuard tip="请先登录后再发布文章">
      <NewArticleForm />
    </AuthGuard>
  );
}

/** 发布文章表单组件 */
function NewArticleForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  // 加载分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await request.get('/api/articles/categories');
        setCategories((res.data as Category[]) || []);
      } catch { /* 静默失败 */ }
      finally { setCatLoading(false); }
    };
    fetchCategories();
  }, []);

  /** 保存草稿 */
  const handleSaveDraft = useCallback(async () => {
    try {
      const values = await form.validateFields(['title', 'content']);
      setLoading(true);
      await request.post('/api/articles', {
        ...form.getFieldsValue(),
        title: values.title,
        content: values.content,
        status: 'draft',
        tags: form.getFieldValue('tags') || [],
      });
      message.success('草稿保存成功');
    } catch {
      // 表单校验失败不提示，接口错误由拦截器处理
    } finally {
      setLoading(false);
    }
  }, [form]);

  /** 发布文章 */
  const handlePublish = useCallback(async (values: ArticleFormData) => {
    setLoading(true);
    try {
      const res = await request.post('/api/articles', {
        ...values,
        status: 'published',
        tags: values.tags || [],
      });
      message.success('文章发布成功！');
      router.push(`/article/${res.data.id}`);
    } catch { /* 错误由拦截器处理 */ }
    finally { setLoading(false); }
  }, [router]);

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>发布新文章</Title>
        </Space>
        {/* 草稿箱入口 */}
        <Button icon={<FileTextOutlined />} onClick={() => router.push('/article/drafts')}>
          草稿箱
        </Button>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={handlePublish} size="large"
          initialValues={{ title: '', content: '', category_id: undefined, tags: [], summary: '' }}
        >
          {/* 文章标题 */}
          <Form.Item name="title" label="文章标题"
            rules={[
              { required: true, message: '请输入文章标题' },
              { max: 200, message: '标题不超过200个字符' },
            ]}
          >
            <Input placeholder="请输入文章标题" showCount maxLength={200} />
          </Form.Item>

          {/* 分类选择 */}
          <Form.Item name="category_id" label="文章分类">
            <Select placeholder="请选择分类（可选）" allowClear loading={catLoading}
              options={categories.map(c => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          {/* 自定义标签 */}
          <Form.Item name="tags" label="标签"
            rules={[{ type: 'array', max: 10, message: '标签不超过10个' }]}
          >
            <Select mode="tags" placeholder="输入标签后按回车添加（可选）" maxTagCount={10}
              tokenSeparators={[',']} style={{ width: '100%' }}
            />
          </Form.Item>

          {/* 文章摘要 */}
          <Form.Item name="summary" label="文章摘要（可选）"
            rules={[{ max: 500, message: '摘要不超过500个字符' }]}
          >
            <Input.TextArea rows={2} placeholder="不填写则自动截取正文前200字" showCount maxLength={500} />
          </Form.Item>

          {/* 富文本编辑器 */}
          <Form.Item name="content" label="文章内容"
            rules={[{ required: true, message: '请输入文章内容' }]}
          >
            <RichTextEditor />
          </Form.Item>

          {/* 操作按钮 */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveDraft}
                loading={loading}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={loading}
              >
                发布文章
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
