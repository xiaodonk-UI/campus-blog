# 校园个人博客 — 后端 API 文档

> 统一响应：`{"code": 状态码, "msg": "提示", "data": 数据}`
> 鉴权：`Authorization: Bearer <Supabase_JWT>`

---

## 用户模块

### POST /api/user/register — 注册
```json
// 请求
{ "username": "zhangsan", "email": "a@b.com", "password": "123456", "nickname": "张三" }
// 返回 201
{ "code": 201, "msg": "验证邮件已发送", "data": { "tip": "验证邮件已发送，请前往邮箱确认完成注册" } }
```

### POST /api/user/login — 登录
```json
// 请求
{ "email": "a@b.com", "password": "123456" }
// 返回 200
{ "code": 200, "msg": "登录成功", "data": { "token": "eyJ...", "user": {...} } }
```

### GET /api/user/profile — 获取用户信息（需登录）
### PUT /api/user/profile — 修改个人信息（需登录）
### POST /api/user/avatar — 上传头像（需登录，multipart/form-data，字段名 file）

---

## 文章模块

### GET /api/articles — 文章列表
查询参数：page, page_size, category_id, status, search, tag, sort, author_id
返回：`{ "list": [...], "total": N, "page": N, "page_size": N, "total_pages": N }`
列表不含 content 正文，author 信息通过别名 `author:users!...` 返回

### GET /api/articles/hot — 热门文章（按点赞数 Top10）
### GET /api/articles/categories — 分类列表
### GET /api/articles/drafts — 我的草稿（需登录）
### GET /api/articles/:id — 文章详情（自动+1浏览数）
### POST /api/articles — 发布文章（需登录，status: published|draft）
### PUT /api/articles/:id — 编辑文章（需登录，仅作者）
### DELETE /api/articles/:id — 删除文章（需登录，仅作者，级联删评论/点赞）

---

## 互动模块

### POST /api/comments — 发表评论（需登录）
```json
{ "article_id": "...", "content": "..." }
```

### GET /api/comments/:article_id — 评论列表（分页，按时间正序）
### DELETE /api/comments/:id — 删除评论（需登录，仅作者）

### POST /api/likes — 点赞/取消（需登录）
```json
{ "article_id": "..." }
// 返回 { "liked": true/false, "like_count": N }
```

---

## 错误码

| code | 含义 |
|------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 不存在 |
| 500 | 服务器错误 |