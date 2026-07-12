-- ============================================================
-- 校园个人博客系统 - 数据库建表脚本（Supabase PostgreSQL）
-- 包含5张表：用户表、分类表、文章表、评论表、点赞表
-- 附带RLS行级安全策略与触发器
-- ============================================================

-- 启用UUID扩展（用于生成主键）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 用户表（users）
-- 存储用户基本信息，与Supabase Auth关联
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 用户唯一ID
    auth_id     UUID UNIQUE NOT NULL,                          -- Supabase Auth提供的auth.uid()
    username    VARCHAR(50) NOT NULL UNIQUE,                    -- 用户名（登录用）
    nickname    VARCHAR(50),                                    -- 昵称（展示用）
    avatar_url  TEXT,                                           -- 头像URL
    bio         TEXT,                                           -- 个人简介
    created_at  TIMESTAMPTZ DEFAULT NOW(),                      -- 注册时间
    updated_at  TIMESTAMPTZ DEFAULT NOW()                       -- 更新时间
);

-- RLS：用户可读取所有用户信息，但仅可修改自己的记录
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 所有人可读取用户信息
CREATE POLICY "允许所有人查看用户信息"
    ON users FOR SELECT
    USING (true);

-- 仅本人可更新自己的信息
CREATE POLICY "仅本人可更新自己的信息"
    ON users FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- 插入时自动关联当前登录用户
CREATE POLICY "注册时自动关联auth_id"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = auth_id);


-- ============================================================
-- 2. 分类表（categories）
-- 文章分类，由系统预置
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(30) NOT NULL UNIQUE,                    -- 分类名称：技术/生活/学习等
    description TEXT,                                           -- 分类描述
    sort_order  INT DEFAULT 0,                                  -- 排序顺序
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS：所有人可读，仅管理员可写（单人博客场景下，作者即管理员）
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看分类"
    ON categories FOR SELECT
    USING (true);

-- 仅登录用户可新增分类（单人博客：作者即管理员）
CREATE POLICY "仅登录用户可新增分类"
    ON categories FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "仅登录用户可更新分类"
    ON categories FOR UPDATE
    USING (auth.role() = 'authenticated');


-- ============================================================
-- 3. 文章表（articles）
-- 博客文章核心数据
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 作者ID
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,     -- 分类ID
    title       VARCHAR(200) NOT NULL,                    -- 文章标题
    content     TEXT NOT NULL,                            -- 文章正文（HTML富文本）
    summary     VARCHAR(500),                             -- 文章摘要
    cover_url   TEXT,                                     -- 封面图URL
    tags        TEXT[] DEFAULT '{}',                      -- 自定义标签数组
    status      VARCHAR(20) DEFAULT 'published',          -- 状态：published/draft
    view_count  INT DEFAULT 0,                            -- 浏览次数
    like_count  INT DEFAULT 0,                            -- 点赞数
    comment_count INT DEFAULT 0,                          -- 评论数
    is_pinned   BOOLEAN DEFAULT false,                    -- 是否置顶
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
-- 全文搜索索引（标题+摘要）
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles
    USING GIN(to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, '')));

-- RLS：所有人可读已发布文章，仅作者可编辑/删除自己的文章
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看已发布文章"
    ON articles FOR SELECT
    USING (status = 'published' OR auth.uid() = (SELECT auth_id FROM users WHERE id = author_id));

CREATE POLICY "仅登录用户可发布文章"
    ON articles FOR INSERT
    WITH CHECK (
        auth.uid() = (SELECT auth_id FROM users WHERE id = author_id)
    );

CREATE POLICY "仅作者可更新自己的文章"
    ON articles FOR UPDATE
    USING (
        auth.uid() = (SELECT auth_id FROM users WHERE id = author_id)
    )
    WITH CHECK (
        auth.uid() = (SELECT auth_id FROM users WHERE id = author_id)
    );

CREATE POLICY "仅作者可删除自己的文章"
    ON articles FOR DELETE
    USING (
        auth.uid() = (SELECT auth_id FROM users WHERE id = author_id)
    );


-- ============================================================
-- 4. 评论表（comments）
-- 文章评论，支持一级评论
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,                              -- 评论内容
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id, created_at ASC);

-- RLS：所有人可读评论，登录用户可发评论，仅评论作者可删除
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看评论"
    ON comments FOR SELECT
    USING (true);

CREATE POLICY "登录用户可发评论"
    ON comments FOR INSERT
    WITH CHECK (
        auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    );

CREATE POLICY "仅评论作者可删除自己的评论"
    ON comments FOR DELETE
    USING (
        auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    );


-- ============================================================
-- 5. 点赞表（likes）
-- 记录用户对文章的点赞，联合唯一约束防止重复点赞
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    -- 联合唯一约束：同一用户对同一文章只能点赞一次
    UNIQUE(article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_article ON likes(article_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);

-- RLS：所有人可查看点赞，登录用户可点赞/取消
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人查看点赞"
    ON likes FOR SELECT
    USING (true);

CREATE POLICY "登录用户可点赞"
    ON likes FOR INSERT
    WITH CHECK (
        auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    );

CREATE POLICY "本人可取消点赞"
    ON likes FOR DELETE
    USING (
        auth.uid() = (SELECT auth_id FROM users WHERE id = user_id)
    );


-- ============================================================
-- 触发器：自动更新文章的评论数
-- ============================================================
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE articles SET comment_count = comment_count - 1 WHERE id = OLD.article_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();


-- ============================================================
-- 触发器：自动更新文章的点赞数
-- ============================================================
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE articles SET like_count = like_count - 1 WHERE id = OLD.article_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_like_count
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_like_count();


-- ============================================================
-- 触发器：自动更新 updated_at 时间戳
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_articles_updated
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ============================================================
-- 预置分类数据
-- ============================================================
INSERT INTO categories (name, description, sort_order) VALUES
    ('技术分享', '编程、AI、前端等技术类文章', 1),
    ('学习笔记', '课程笔记、读书心得等', 2),
    ('校园生活', '校园活动、生活感悟等', 3),
    ('资源推荐', '好用的工具、网站、书籍推荐', 4),
    ('其他', '未分类的文章', 99)
ON CONFLICT (name) DO NOTHING;
