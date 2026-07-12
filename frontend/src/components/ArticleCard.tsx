'use client';

/**
 * 校园个人博客系统 - 文章卡片组件
 * 用于首页文章列表展示：标题、摘要、作者、标签、评论/点赞数等
 */
import React from 'react';
import { Card, Tag, Space, Avatar, Typography, Tooltip } from 'antd';
import {
  EyeOutlined, LikeOutlined, CommentOutlined, ClockCircleOutlined, UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';
import type { Article } from '@/types';

const { Text, Paragraph } = Typography;

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Card
      hoverable
      style={{ marginBottom: 16, borderRadius: 8 }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      {/* ===== 标题行 ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {article.is_pinned && <Tag color="red">置顶</Tag>}
        <Link
          href={`/article/${article.id}`}
          style={{ fontSize: 18, fontWeight: 600, color: 'inherit', textDecoration: 'none', flex: 1 }}
        >
          {article.title}
        </Link>
      </div>

      {/* ===== 摘要 ===== */}
      <Paragraph
        ellipsis={{ rows: 2 }}
        style={{ color: '#666', marginBottom: 12, lineHeight: 1.6 }}
      >
        {article.summary || article.content?.replace(/<[^>]*>/g, '').slice(0, 200) || '（无摘要）'}
      </Paragraph>

      {/* ===== 底部信息行 ===== */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* 左侧：作者 + 时间 + 分类 */}
        <Space wrap size={12}>
          <Space size={4}>
            <Avatar
              src={article.author?.avatar_url}
              icon={<UserOutlined />}
              size={20}
            />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {article.author?.nickname || article.author?.username || '未知'}
            </Text>
          </Space>
          <Tooltip title={dayjs(article.created_at).format('YYYY-MM-DD HH:mm')}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <ClockCircleOutlined style={{ marginRight: 2 }} />
              {dayjs(article.created_at).format('MM-DD')}
            </Text>
          </Tooltip>
          {article.category && (
            <Link href={`/?category_id=${article.category_id}`} passHref>
              <Tag color="blue" style={{ cursor: 'pointer', margin: 0 }}>{article.category.name}</Tag>
            </Link>
          )}
        </Space>

        {/* 右侧：浏览量 + 点赞数 + 评论数 */}
        <Space size={16}>
          <Tooltip title="浏览量">
            <Text type="secondary" style={{ fontSize: 13 }}>
              <EyeOutlined style={{ marginRight: 2 }} />{article.view_count || 0}
            </Text>
          </Tooltip>
          <Tooltip title="点赞数">
            <Text type="secondary" style={{ fontSize: 13 }}>
              <LikeOutlined style={{ marginRight: 2 }} />{article.like_count || 0}
            </Text>
          </Tooltip>
          <Tooltip title="评论数">
            <Text type="secondary" style={{ fontSize: 13 }}>
              <CommentOutlined style={{ marginRight: 2 }} />{article.comment_count || 0}
            </Text>
          </Tooltip>
        </Space>
      </div>

      {/* ===== 标签 ===== */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {article.tags.map((tag: string) => (
            <Link key={tag} href={`/?tag=${encodeURIComponent(tag)}`} passHref>
              <Tag style={{ cursor: 'pointer', marginBottom: 4 }}>{tag}</Tag>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
