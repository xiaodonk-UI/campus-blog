# AI 辅助开发提问日志

> 项目：校园个人博客 Campus Blog | 工具：Claude Code (VS Code 插件)
> 日期：2026-07-09 ~ 2026-07-18

---

## 一、项目初始化

### 1. 生成全栈项目代码
- **提问**：一次性生成校园个人博客系统全套前后端代码（Next.js + Flask + Supabase）
- **AI 输出**：36 个文件的完整项目
- **涉及文件**：全部初始代码

## 二、报错排查

### 2. 注册按钮无响应
- **报错**：点击注册无任何反应
- **根因**：`useSearchParams()` 缺 Suspense 包裹 → hydration 失败
- **修复**：Navbar/首页/登录页加 Suspense
- **涉及文件**：`layout.tsx`, `page.tsx`, `login/page.tsx`, `Navbar.tsx`

### 3. Token 验证失败：alg value is not allowed
- **报错**：Supabase JWT 验证失败
- **诊断**：Supabase 使用 ES256 非对称加密而非 HS256
- **修复**：引入 PyJWKClient 从 JWKS 端点获取公钥
- **涉及文件**：`utils/auth.py`, `requirements.txt`

### 4. 文章列表/详情超时
- **报错**：API 请求 15 秒超时
- **根因**：Supabase SDK 内置 httpx 连接池挂死
- **修复**：数据层从 SDK 迁移到 requests 库
- **涉及文件**：`utils/supabase_client.py`（完全重写）

### 5. Vercel 构建 TypeScript 报错
- **报错**：antd API 不兼容（Alert title/message、Spin description/tip 等）
- **修复**：全部回退到 antd v5 API
- **涉及文件**：`page.tsx`, `login/page.tsx`, `AuthGuard.tsx`, `RichTextEditor.tsx` 等

### 6. Vercel 只读文件系统报错
- **报错**：`os.makedirs(UPLOAD_FOLDER)` → OSError
- **修复**：删除本地目录创建代码
- **涉及文件**：`backend/app.py`

### 7. Vercel 文章详情页 404
- **报错**：`/article/xxx` 返回 404
- **根因**：vercel.json catch-all rewrite 导致双重 frontend/ 前缀
- **修复**：删除多余 rewrite
- **涉及文件**：`vercel.json`

### 8. API 请求双重 /api/api/ 前缀
- **修复**：`NEXT_PUBLIC_API_BASE` 改为空字符串
- **涉及文件**：`.env.local`, `request.ts`

## 三、功能开发

### 9. 草稿箱功能
- **需求**：管理保存的草稿
- **方案**：后端 `/api/articles/drafts` 接口 + 前端草稿箱页面
- **涉及文件**：`routes/article.py`, `article/drafts/page.tsx`

### 10. 头像上传
- **方案**：后端 `/api/user/avatar` 接口，base64 存储
- **涉及文件**：`routes/user.py`, `profile/page.tsx`

### 11. 富文本编辑器完善
- **功能**：图片插入（上传/URL）、超链接（自动修正 http//）、代码块（highlight.js 高亮）
- **涉及文件**：`components/RichTextEditor.tsx`

### 12. 动态校园风 UI 背景
- **方案**：纯 CSS 5 色渐变 + 浮动光晕 + 玻璃态卡片
- **涉及文件**：`globals.css`, `layout.tsx`

### 13. 注册流程优化
- **需求**：验证邮件发出即返回成功，DB 失败不阻断
- **涉及文件**：`routes/user.py`, `AuthContext.tsx`

## 四、Vercel 部署配置

### 14. 全栈 Vercel 部署
- **过程**：vercel.json 配置、api/index.py Serverless 入口、根 package.json、根 requirements.txt
- **涉及文件**：`vercel.json`, `api/index.py`, `package.json`, `requirements.txt`