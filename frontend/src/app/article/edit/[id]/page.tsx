'use client';

/**
 * 校园个人博客系统 - 文章编辑页面
 * 与发布页面类似，但预加载文章数据进行编辑
 * 需要登录且仅作者本人可访问
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, Select, Button, App, Space, Typography, Spin, Alert, Empty, Skeleton } from 'antd';
import { SaveOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import request from '@/utils/request';
import type { Category, Article, ArticleFormData } from '@/types';

const { Title } = Typography;

// 富文本编辑器按需加载
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: 400, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载编辑器中...</div>,
});

export default function EditArticlePage() {
  return (
    <AuthGuard tip="请先登录后再编辑文章">
      <EditArticleForm />
    </AuthGuard>
  );
}

/** 编辑文章表单组件 */
function EditArticleForm() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const articleId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);

  /** 加载文章数据 */
  useEffect(() => {
    const fetchData = async () => {
      setFetching(true);
      try {
        // 并行加载文章详情和分类列表
        const [articleRes, catRes] = await Promise.all([
          request.get(`/api/articles/${articleId}`),
          request.get('/api/articles/categories'),
        ]);

        const article = articleRes.data as Article;
        setCategories((catRes.data as Category[]) || []);
        setOriginalArticle(article);

        // 检查是否为作者本人
        if (user && article.author_id !== user.id) {
          setFetchError('无权编辑他人的文章');
          return;
        }

        // 预填表单数据
        form.setFieldsValue({
          title: article.title,
          content: article.content,
          category_id: article.category_id || undefined,
          tags: article.tags || [],
          summary: article.summary || '',
        });
      } catch (err: any) {
        setFetchError(err?.message || '文章加载失败');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [articleId, form, user]);

  /** 草稿状态判断 */
  const isDraft = originalArticle?.status === 'draft';

  /** 更新草稿（仅更新不发布） */
  const handleSaveDraft = useCallback(async () => {
    try {
      const values = await form.validateFields(['title', 'content']);
      setLoading(true);
      await request.put(`/api/articles/${articleId}`, {
        ...form.getFieldsValue(),
        title: values.title,
        content: values.content,
        status: 'draft',
        tags: form.getFieldValue('tags') || [],
      });
      message.success('草稿已更新');
      router.push('/article/drafts');
    } catch { /* 表单校验失败不提示 */ }
    finally { setLoading(false); }
  }, [form, articleId, router]);

  /** 更新并发布 */
  const handleSubmit = useCallback(async (values: ArticleFormData) => {
    setLoading(true);
    try {
      await request.put(`/api/articles/${articleId}`, {
        ...values,
        status: 'published',
        tags: values.tags || [],
      });
      message.success('文章更新成功！');
      router.push(`/article/${articleId}`);
    } catch { /* 错误由拦截器处理 */ }
    finally { setLoading(false); }
  }, [articleId, router]);

  // 加载中
  if (fetching) {
    return <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>;
  }

  // 加载失败
  if (fetchError) {
    return (
      <Alert title="无法编辑" description={fetchError} type="error" showIcon
        action={<Button onClick={() => router.back()}>返回</Button>}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>编辑文章</Title>
        </Space>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
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
            <Select placeholder="请选择分类（可选）" allowClear
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

          {/* 摘要 */}
          <Form.Item name="summary" label="文章摘要（可选）">
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
              {isDraft && (
                <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
                  更新草稿
                </Button>
              )}
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading}>
                更新并发布
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
