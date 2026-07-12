/**
 * 校园个人博客系统 - TypeScript 类型定义
 * 统一管理前后端数据结构类型
 */

// ==================== 用户相关类型 ====================

/** 用户信息 */
export interface User {
  id: string;
  auth_id: string;
  username: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/** 登录请求参数 */
export interface LoginParams {
  email: string;
  password: string;
}

/** 注册请求参数 */
export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}

/** 登录/注册响应 */
export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
}

// ==================== 文章相关类型 ====================

/** 文章分类 */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

/** 文章 */
export interface Article {
  id: string;
  author_id: string;
  category_id: string | null;
  title: string;
  content: string;
  summary: string | null;
  cover_url: string | null;
  tags: string[];
  status: 'published' | 'draft';
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  /** 关联的作者信息 */
  author?: Pick<User, 'id' | 'username' | 'nickname' | 'avatar_url'>;
  /** 关联的分类信息 */
  category?: Pick<Category, 'id' | 'name'> | null;
  /** 当前用户是否已点赞 */
  is_liked?: boolean;
  /** 文章正文（兼容） */
  body?: string;
}

/** 创建/编辑文章参数 */
export interface ArticleFormData {
  title: string;
  content: string;
  category_id?: string;
  tags?: string[];
  summary?: string;
  cover_url?: string;
  status?: 'published' | 'draft';
}

// ==================== 评论相关类型 ====================

/** 评论 */
export interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  created_at: string;
  /** 关联的用户信息 */
  user?: Pick<User, 'id' | 'username' | 'nickname' | 'avatar_url'>;
}

// ==================== 通用响应类型 ====================

/** 后端统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

/** 分页列表数据 */
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}
