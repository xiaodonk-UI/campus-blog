'use client';

/**
 * 校园个人博客系统 - 评论区组件
 * 功能：分页评论列表、发表评论、作者删除自己的评论
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Input, Button, Avatar, Space, Typography, Popconfirm, App,
  Empty, Pagination, Spin,
} from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import request from '@/utils/request';
import type { Comment, PaginatedData } from '@/types';

const { Text } = Typography;

interface CommentSectionProps {
  articleId: string;
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const pageSize = 10;

  /** 加载评论列表 */
  const fetchComments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await request.get(`/api/comments/${articleId}`, {
        params: { page: p, page_size: pageSize }
      });
      const data = res.data as PaginatedData<Comment>;
      setComments(data.list || []);
      setTotal(data.total || 0);
    } catch {
      // 错误由拦截器统一处理
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments(page);
  }, [page, fetchComments]);

  /** 发表评论 */
  const handleSubmit = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) {
      message.warning('请输入评论内容');
      return;
    }
    if (!user) {
      message.warning('请先登录后再发表评论');
      return;
    }

    setSubmitting(true);
    try {
      await request.post('/api/comments', { article_id: articleId, content });
      message.success('评论成功');
      setInputValue('');
      // 刷新评论列表（回到第一页）
      setPage(1);
      fetchComments(1);
    } catch {
      // 错误由拦截器统一处理
    } finally {
      setSubmitting(false);
    }
  }, [inputValue, user, articleId, fetchComments]);

  /** 删除评论 */
  const handleDelete = useCallback(async (commentId: string) => {
    try {
      await request.delete(`/api/comments/${commentId}`);
      message.success('评论已删除');
      fetchComments(page);
    } catch {
      // 错误由拦截器统一处理
    }
  }, [page, fetchComments]);

  return (
    <div style={{ marginTop: 32 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        评论 ({total})
      </Typography.Title>

      {/* ===== 评论输入框 ===== */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Avatar src={user?.avatar_url} icon={<UserOutlined />} />
        <div style={{ flex: 1 }}>
          <Input.TextArea
            rows={3}
            placeholder={user ? '写下你的评论...' : '请先登录后再发表评论'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            maxLength={2000}
            showCount
            disabled={!user}
          />
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!user || !inputValue.trim()}
            style={{ marginTop: 8 }}
          >
            发表评论
          </Button>
        </div>
      </div>

      {/* ===== 评论列表 ===== */}
      <Spin spinning={loading}>
        {comments.length === 0 && !loading ? (
          <Empty description="暂无评论，来抢沙发吧~" />
        ) : (
          <div>
            {comments.map((comment) => {
              const isCommentOwner = user && user.id === comment.user_id;
              return (
                <div key={comment.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Avatar src={comment.user?.avatar_url || (comment as any)?.users?.avatar_url} icon={<UserOutlined />} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Text strong>{(comment as any).user?.nickname || (comment as any).users?.nickname || (comment as any).user?.username || (comment as any).users?.username || '匿名'}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(comment.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                        </Space>
                        {isCommentOwner && (
                          <Popconfirm title="确定删除这条评论吗？" onConfirm={() => handleDelete(comment.id)} okText="确定" cancelText="取消">
                            <Button type="text" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                          </Popconfirm>
                        )}
                      </div>
                      <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', marginTop: 4 }}>{comment.content}</Typography.Paragraph>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Spin>

      {/* ===== 分页器 ===== */}
      {total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={pageSize}
            onChange={(p) => setPage(p)}
            size="small"
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}
