'use client';

/**
 * 校园个人博客系统 - 文章详情页
 * 功能：完整文章展示、点赞（一人一次）、评论区、作者信息展示
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Typography, Tag, Avatar, Space, Button, Spin, Alert, Empty, Divider, Popconfirm, App, Skeleton } from 'antd';
import {
  EyeOutlined, LikeOutlined, LikeFilled, ClockCircleOutlined,
  EditOutlined, DeleteOutlined, UserOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import request from '@/utils/request';
import CommentSection from '@/components/CommentSection';
import type { Article } from '@/types';

const { Title, Text, Paragraph } = Typography;

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const articleId = params.id as string;

  // ===== 状态 =====
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // ===== 数据加载 =====

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await request.get(`/api/articles/${articleId}`);
      const data = res.data as Article;
      setArticle(data);
      setLiked(data.is_liked || false);
      setLikeCount(data.like_count || 0);
    } catch (err: any) {
      setError(err?.message || '文章加载失败');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // ===== 点赞操作 =====

  const handleLike = async () => {
    if (!user) {
      message.warning('请先登录后再点赞');
      return;
    }
    setLikeLoading(true);
    try {
      const res = await request.post('/api/likes', { article_id: articleId });
      const { liked: newLiked, like_count: newCount } = res.data as { liked: boolean; like_count: number };
      setLiked(newLiked);
      setLikeCount(newCount);
    } catch { /* 错误由拦截器处理 */ }
    finally { setLikeLoading(false); }
  };

  // ===== 删除文章 =====

  const handleDelete = async () => {
    try {
      await request.delete(`/api/articles/${articleId}`);
      message.success('文章已删除');
      router.replace('/');
    } catch { /* 错误由拦截器处理 */ }
  };

  const isAuthor = user && article && user.id === article.author_id;

  // ===== 渲染 =====

  // 加载态
  if (loading) {
    return (
      <Card><Skeleton active paragraph={{ rows: 10 }} /></Card>
    );
  }

  // 错误态
  if (error) {
    return (
      <Alert title="加载失败" description={error} type="error" showIcon
        action={<Button onClick={fetchArticle}>重试</Button>}
      />
    );
  }

  // 空数据
  if (!article) {
    return <Empty description="文章不存在" />;
  }

  return (
    <div>
      {/* 返回按钮 */}
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()}
        style={{ padding: 0, marginBottom: 16 }}>
        返回
      </Button>

      <Card style={{ borderRadius: 12 }}>
        {/* ===== 文章头部信息 ===== */}
        <div style={{ marginBottom: 24 }}>
          {/* 标题 */}
          <Title level={2} style={{ marginBottom: 12 }}>{article.title}</Title>

          {/* 作者 + 时间 + 分类 */}
          <Space wrap size={12} style={{ marginBottom: 12 }}>
            <Space size={6}>
              <Avatar src={article.author?.avatar_url} icon={<UserOutlined />} size={28} />
              <Text>{article.author?.nickname || article.author?.username || '未知'}</Text>
            </Space>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {dayjs(article.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
            {article.category && (
              <Tag color="blue">{article.category.name}</Tag>
            )}
          </Space>

          {/* 统计 + 操作 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space size={16}>
              <Text type="secondary"><EyeOutlined /> {article.view_count || 0} 阅读</Text>
              <Text type="secondary"><LikeOutlined /> {likeCount} 点赞</Text>
              <Text type="secondary">💬 {article.comment_count || 0} 评论</Text>
            </Space>

            {/* 作者操作按钮 */}
            {isAuthor && (
              <Space>
                <Button size="small" icon={<EditOutlined />}
                  onClick={() => router.push(`/article/edit/${articleId}`)}>
                  编辑
                </Button>
                <Popconfirm title="确定删除这篇文章吗？" onConfirm={handleDelete}
                  okText="确定" cancelText="取消">
                  <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </div>

        <Divider />

        {/* ===== 标签 ===== */}
        {article.tags && article.tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {article.tags.map((tag: string) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}

        {/* ===== 文章正文 ===== */}
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <Divider />

        {/* ===== 点赞按钮 ===== */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Button
            size="large"
            icon={liked ? <LikeFilled /> : <LikeOutlined />}
            onClick={handleLike}
            loading={likeLoading}
            type={liked ? 'primary' : 'default'}
            style={{ minWidth: 120, borderRadius: 20 }}
          >
            {liked ? '已点赞' : '点赞'} {likeCount > 0 && `(${likeCount})`}
          </Button>
        </div>
      </Card>

      {/* ===== 评论区 ===== */}
      <Card style={{ marginTop: 24, borderRadius: 12 }}>
        <CommentSection articleId={articleId} />
      </Card>
    </div>
  );
}
