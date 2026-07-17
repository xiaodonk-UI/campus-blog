'use client';

/**
 * 校园个人博客系统 - 博客首页
 * 功能：文章分页卡片列表、分类侧边筛选、热门文章排行、关键词搜索
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Row, Col, Pagination, Spin, Empty, Alert, Card, Tag, Skeleton } from 'antd';
import { FireOutlined, FolderOutlined, ReloadOutlined } from '@ant-design/icons';
import ArticleCard from '@/components/ArticleCard';
import request from '@/utils/request';
import type { Article, Category, PaginatedData } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从URL参数获取筛选条件
  const urlSearch = searchParams.get('search') || '';
  const urlCategory = searchParams.get('category_id') || '';
  const urlTag = searchParams.get('tag') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  // ===== 状态管理 =====
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(urlPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotArticles, setHotArticles] = useState<Article[]>([]);
  const [hotLoading, setHotLoading] = useState(true);

  // 当前筛选条件
  const activeCategory = urlCategory;
  const activeTag = urlTag;
  const activeSearch = urlSearch;

  // ===== 数据加载 =====

  /** 加载文章列表 */
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: 10,
        status: 'published',
      };
      if (activeCategory) params.category_id = activeCategory;
      if (activeSearch) params.search = activeSearch;
      if (activeTag) params.tag = activeTag;

      const res = await request.get('/api/articles', { params });
      const data = res.data as PaginatedData<Article>;
      setArticles(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setError('加载文章失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, activeSearch, activeTag]);

  /** 加载分类列表 */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await request.get('/api/articles/categories');
      setCategories((res.data as Category[]) || []);
    } catch { /* 静默失败 */ }
  }, []);

  /** 加载热门文章 */
  const fetchHotArticles = useCallback(async () => {
    setHotLoading(true);
    try {
      const res = await request.get('/api/articles/hot');
      setHotArticles((res.data as Article[]) || []);
    } catch { /* 静默失败 */ }
    finally { setHotLoading(false); }
  }, []);

  useEffect(() => {
    fetchArticles();
    fetchCategories();
    fetchHotArticles();
  }, [fetchArticles, fetchCategories, fetchHotArticles]);

  // ===== 事件处理 =====

  /** 分页切换 */
  const handlePageChange = (p: number) => {
    setPage(p);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** 点击分类筛选 */
  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category_id', categoryId);
    if (activeSearch) params.set('search', activeSearch);
    router.push(`/?${params.toString()}`);
    setPage(1);
  };

  /** 清除所有筛选 */
  const handleClearFilter = () => {
    router.push('/');
    setPage(1);
  };

  const hasFilter = activeCategory || activeTag || activeSearch;

  // ===== 渲染 =====
  return (
    <div>
      {/* 筛选条件提示 */}
      {hasFilter && (
        <Alert
          message={
            <span>
              {activeSearch && <>搜索：&ldquo;{activeSearch}&rdquo; </>}
              {activeCategory && <>分类：{categories.find(c => c.id === activeCategory)?.name || activeCategory} </>}
              {activeTag && <>标签：{activeTag} </>}
              <a onClick={handleClearFilter} style={{ marginLeft: 8 }}>清除筛选</a>
            </span>
          }
          type="info"
          closable
          onClose={handleClearFilter}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* ===== 左侧：文章列表（占3/4宽度） ===== */}
        <Col xs={24} lg={17}>
          {error ? (
            <Alert
              message="加载失败"
              description={error}
              type="error"
              showIcon
              action={<a onClick={fetchArticles}><ReloadOutlined /> 重试</a>}
            />
          ) : loading ? (
            /* 加载骨架屏 */
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} style={{ marginBottom: 16 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            ))
          ) : articles.length === 0 ? (
            <Empty description={hasFilter ? '没有找到匹配的文章' : '还没有文章，快去发布第一篇吧~'} />
          ) : (
            <>
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}

              {/* 分页器 */}
              {total > 10 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={10}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(t) => `共 ${t} 篇文章`}
                  />
                </div>
              )}
            </>
          )}
        </Col>

        {/* ===== 右侧：侧边栏（占1/4宽度） ===== */}
        <Col xs={24} lg={7}>
          {/* 分类筛选 */}
          <Card
            title={<span><FolderOutlined /> 文章分类</span>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Tag
                color={!activeCategory ? 'blue' : 'default'}
                style={{ cursor: 'pointer' }}
                onClick={handleClearFilter}
              >
                全部
              </Tag>
              {categories.map((cat) => (
                <Tag
                  key={cat.id}
                  color={activeCategory === cat.id ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  {cat.name}
                </Tag>
              ))}
            </div>
          </Card>

          {/* 热门文章排行 */}
          <Card
            title={<span><FireOutlined style={{ color: '#ff4d4f' }} /> 热门文章</span>}
            size="small"
          >
            {hotLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : hotArticles.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div>
                {hotArticles.map((item, index) => (
                  <div key={item.id} style={{ padding: '8px 0', cursor: 'pointer' }}
                    onClick={() => router.push(`/article/${item.id}`)}
                  >
                    <span style={{
                      display: 'inline-block', width: 20, height: 20,
                      lineHeight: '20px', textAlign: 'center',
                      background: index < 3 ? '#ff4d4f' : '#999',
                      color: '#fff', borderRadius: 4, fontSize: 12,
                      marginRight: 8, flexShrink: 0,
                    }}>
                      {index + 1}
                    </span>
                    <span style={{
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 4, flexShrink: 0 }}>
                      {item.like_count}赞
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
