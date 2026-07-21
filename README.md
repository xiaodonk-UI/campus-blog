# 📝 校园个人博客 Campus Blog

> 全栈校园博客系统 — Next.js 15 + Flask + Supabase，单人独立开发，支持 Vercel 一键部署
> 在线地址：https://campus-blog-qf62nqqch-xiaodonk.vercel.app

---

## 技术栈

| 层 | 技术 | 版本 |
|-----|------|------|
| 前端框架 | Next.js (App Router) | 15.5 |
| UI 组件库 | Ant Design | 5.x |
| 后端框架 | Python Flask | 3.1 |
| 数据库 | Supabase (PostgreSQL) | — |
| 部署平台 | Vercel | — |
| AI 辅助 | Claude Code (VS Code 插件) | — |

## 项目目录

```
campus-blog/
├── api/                       # Vercel Python Serverless 入口
│   └── index.py               # 包装 Flask WSGI 应用
├── backend/                   # Flask 后端
│   ├── api/index.py           # 本地开发入口
│   ├── app.py                 # Flask 应用工厂 + CORS
│   ├── config.py              # 配置中心（环境变量）
│   ├── requirements.txt       # Python 依赖
│   ├── utils/
│   │   ├── supabase_client.py # 数据库 CRUD 工具（requests 实现）
│   │   ├── auth.py            # JWT 鉴权装饰器（JWKS/ES256）
│   │   └── response.py        # 统一响应格式
│   ├── routes/
│   │   ├── user.py            # 用户模块（注册/登录/头像）
│   │   ├── article.py         # 文章模块（CRUD+搜索+筛选）
│   │   └── interaction.py     # 互动模块（评论+点赞）
│   └── middleware/
│       └── error_handler.py   # 全局异常捕获
├── frontend/                  # Next.js 前端
│   ├── src/
│   │   ├── app/               # 页面路由
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── login/         # 登录页
│   │   │   ├── register/      # 注册页
│   │   │   ├── article/
│   │   │   │   ├── [id]/      # 文章详情（动态路由）
│   │   │   │   ├── new/       # 发布文章
│   │   │   │   ├── edit/[id]/ # 编辑文章
│   │   │   │   └── drafts/    # 草稿箱
│   │   │   └── profile/       # 个人中心
│   │   ├── components/        # 通用组件
│   │   │   ├── Navbar.tsx     # 全局导航
│   │   │   ├── AuthGuard.tsx  # 登录拦截
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   └── RichTextEditor.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # 全局登录状态
│   │   └── utils/
│   │       ├── request.ts     # Axios 封装
│   │       └── auth.ts        # Token 管理
│   └── .env.local
├── database/
│   └── schema.sql             # 建表 SQL + RLS 策略
├── vercel.json                # Vercel 部署配置
├── requirements.txt           # 根 Python 依赖（Vercel 用）
├── docs-screenshots/          # 📸 考核截图包
│   ├── db/                    # Supabase 数据库截图
│   ├── api-runtime/           # Vercel 部署 / API 网络截图
│   └── ai-review/             # AI 代码审查对话截图
├── README.md                  # 本文件
├── prompt_log.md              # AI 提问日志
├── API文档.md                 # 后端接口文档
└── 实训总结报告.md            # 实训总结
```

## 本地启动

### 1. 后端

```bash
cd backend
cp .env.example .env          # 编辑填入 Supabase 密钥
pip install -r requirements.txt
py app.py                     # → http://localhost:5000
```

### 2. 前端

```bash
cd frontend
cp .env.local.example .env.local  # NEXT_PUBLIC_API_BASE=http://localhost:5000
npm install
npm run dev                   # → http://localhost:3000
```

### 3. 数据库

将 `database/schema.sql` 复制到 Supabase SQL Editor 执行，创建全部表 + RLS 策略。

## Vercel 一键部署

1. 推送代码到 GitHub
2. Vercel → Import Project → 选择仓库
3. Root Directory 设为 `./`
4. 添加 Environment Variables：
   - `NEXT_PUBLIC_API_BASE` = (空)
   - `SUPABASE_URL`、`SUPABASE_KEY`、`SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
5. Deploy

## 演示视频

> 百度网盘下载：[项目功能演示.mp4](https://pan.baidu.com/s/1q6GAW_B-xeSSlFc0b2nDPA) 提取码: `tedm`

## 配套材料

- **prompt_log.md**：完整 AI 辅助开发提问日志
- **API文档.md**：全部后端接口文档
- **实训总结报告.md**：不少于 600 字实训总结
- **docs-screenshots/**：考核截图包（数据库/接口/AI Review）
- **database/schema.sql**：DDL + RLS + 触发器