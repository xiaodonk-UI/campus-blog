'use client';

/**
 * 校园个人博客系统 - 草稿箱页面
 * 展示当前用户保存的所有草稿，支持继续编辑或删除
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Empty, Spin, Tag, Space, Typography, Popconfirm, message, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AuthGuard from '@/components/AuthGuard';
import request from '@/utils/request';
import type { Article, PaginatedData } from '@/types';

const { Title, Text } = Typography;

export default function DraftsPage() {
  return (
    <AuthGuard tip="请先登录后查看草稿箱">
      <DraftsContent />
    </AuthGuard>
  );
}

function DraftsContent() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /** 加载草稿列表 */
  const fetchDrafts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await request.get('/api/articles/drafts', {
        params: { page: p, page_size: 10 }
      });
      const data = res.data as PaginatedData<Article>;
      setDrafts(data.list || []);
      setTotal(data.total || 0);
    } catch { /* 错误由拦截器处理 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrafts(page); }, [page, fetchDrafts]);

  /** 删除草稿 */
  const handleDelete = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await request.delete(`/api/articles/${id}`);
      message.success('草稿已删除');
      fetchDrafts(page);
    } catch { /* 错误由拦截器处理 */ }
  }, [page, fetchDrafts]);

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            草稿箱（{total}篇）
          </Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/article/new')}>
          写新文章
        </Button>
      </div>

      {/* 草稿列表 */}
      <Spin spinning={loading}>
        {!loading && drafts.length === 0 ? (
          <Card style={{ borderRadius: 12 }}>
            <Empty description="草稿箱是空的">
              <Button type="primary" onClick={() => router.push('/article/new')}>去写文章</Button>
            </Empty>
          </Card>
        ) : (
          <>
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                hoverable
                size="small"
                style={{ marginBottom: 12, borderRadius: 8 }}
                onClick={() => router.push(`/article/edit/${draft.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                    <Text strong ellipsis style={{ fontSize: 15, display: 'block' }}>
                      {draft.title || '（无标题）'}
                    </Text>
                    <Space size={12} style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(draft.updated_at).format('YYYY-MM-DD HH:mm')} 保存
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {draft.summary?.slice(0, 50) || draft.content?.replace(/<[^>]*>/g, '').slice(0, 50) || '...'}
                      </Text>
                    </Space>
                  </div>
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => { e.stopPropagation(); router.push(`/article/edit/${draft.id}`); }}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确定删除这篇草稿？"
                      onConfirm={(e) => handleDelete(draft.id, e)}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="确定" cancelText="取消"
                    >
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
                  onChange={(p) => setPage(p)} size="small" showSizeChanger={false} />
              </div>
            )}
          </>
        )}
      </Spin>
    </div>
  );
}