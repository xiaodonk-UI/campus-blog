"""
校园个人博客系统 - 文章模块路由
包含：新增文章、分页列表筛选搜索、获取详情、编辑文章、删除文章
"""
from flask import Blueprint, request, g
from utils.response import success, created, fail, paginated_list
from utils.auth import login_required, optional_login
from utils.supabase_client import db
from config import Config
import logging

logger = logging.getLogger(__name__)

# 创建文章模块蓝图，URL前缀 /api/articles
article_bp = Blueprint("article", __name__, url_prefix="/api/articles")


# ==================== 参数校验工具 ====================

def validate_article_data(data: dict, is_update: bool = False) -> str | None:
    """校验文章数据，返回错误信息或None（表示通过）"""
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not is_update or "title" in data:
        if not title:
            return "文章标题不能为空"
        if len(title) > 200:
            return "文章标题不超过200个字符"

    if not is_update or "content" in data:
        if not content:
            return "文章内容不能为空"

    if "category_id" in data and data["category_id"]:
        category = db.get_by_id("categories", data["category_id"])
        if not category:
            return "所选分类不存在"

    if "tags" in data:
        tags = data["tags"]
        if not isinstance(tags, list):
            return "标签格式不正确（需要数组）"
        if len(tags) > 10:
            return "标签数量不超过10个"

    if "status" in data:
        if data["status"] not in ("published", "draft"):
            return "状态仅支持 published 或 draft"

    return None


# ==================== 文章路由 ====================

@article_bp.route("", methods=["GET"])
@optional_login
def list_articles():
    """
    文章分页列表接口（带筛选和搜索）
    查询参数:
        page:       页码（默认1）
        page_size:  每页条数（默认10，最大50）
        category_id:分类筛选
        status:     状态筛选（默认published）
        search:     关键词搜索（匹配标题和摘要）
        tag:        标签筛选
        sort:       排序字段（默认created_at）
        author_id:  按作者筛选
    """
    # 解析分页参数
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", Config.PAGE_SIZE_DEFAULT, type=int)
    page = max(1, page)
    page_size = min(max(1, page_size), Config.PAGE_SIZE_MAX)

    # 构建过滤条件
    filters = {}
    if request.args.get("category_id"):
        filters["category_id"] = request.args.get("category_id")
    if request.args.get("author_id"):
        filters["author_id"] = request.args.get("author_id")

    # 状态：未登录只看已发布，登录后可看自己的草稿
    status = request.args.get("status", "published")
    filters["status"] = status

    # 排序
    sort_field = request.args.get("sort", "created_at")
    allowed_sort_fields = ("created_at", "updated_at", "view_count", "like_count", "comment_count")
    if sort_field not in allowed_sort_fields:
        sort_field = "created_at"

    # 搜索关键词
    search = request.args.get("search")
    search_columns = ["title", "summary"] if search else None

    # 标签筛选
    tag_filter = request.args.get("tag")

    # 执行分页查询
    result = db.paginated_query(
        table="articles",
        page=page,
        page_size=page_size,
        filters=filters,
        search=search,
        search_columns=search_columns,
        order_by=sort_field,
        ascending=False,
        # 列表不返回content正文（可能含大体积base64图片致超时）
        select="id,title,summary,cover_url,tags,status,view_count,like_count,comment_count,is_pinned,author_id,category_id,created_at,updated_at,users!articles_author_id_fkey(username,nickname,avatar_url)"
    )

    # 如果按标签筛选，在应用层过滤（因为Supabase数组查询有限制）
    items = result["list"]
    if tag_filter and items:
        items = [a for a in items if tag_filter in (a.get("tags") or [])]
        result["list"] = items
        result["total"] = len(items)

    logger.info(f"文章列表查询: page={page}, size={page_size}, total={result['total']}")
    return paginated_list(result["list"], result["total"], page, page_size)


@article_bp.route("/drafts", methods=["GET"])
@login_required
def my_drafts():
    """
    获取当前用户的草稿列表
    只返回自己的草稿，按更新时间倒序
    """
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", Config.PAGE_SIZE_DEFAULT, type=int)
    page = max(1, page)
    page_size = min(max(1, page_size), Config.PAGE_SIZE_MAX)

    result = db.paginated_query(
        table="articles",
        page=page,
        page_size=page_size,
        filters={"author_id": g.current_user["id"], "status": "draft"},
        order_by="updated_at",
        ascending=False,
    )
    return paginated_list(result["list"], result["total"], page, page_size)


@article_bp.route("/hot", methods=["GET"])
def hot_articles():
    """
    热门文章排行接口（按点赞数降序，取前10）
    """
    try:
        data = db.query("articles", select="id,title,like_count,comment_count,view_count,created_at",
                        filters={"status": "published"}, order_by="like_count", ascending=False, limit=10)
        return success(data, "查询成功")
    except Exception as e:
        logger.error(f"查询热门文章失败: {e}")
        return success([], "查询成功")


@article_bp.route("/categories", methods=["GET"])
def list_categories():
    """获取所有分类列表"""
    categories = db.list_all("categories", order_by="sort_order", ascending=True)
    return success(categories, "查询成功")


@article_bp.route("/<article_id>", methods=["GET"])
@optional_login
def get_article(article_id):
    """
    获取文章详情
    自动增加浏览次数（每次访问+1）
    """
    article = db.get_by_id("articles", article_id)
    if not article:
        return fail("文章不存在", code=404)

    if article.get("status") == "draft":
        # 草稿仅作者可查看
        current_user = getattr(g, "current_user", None)
        if not current_user or current_user["id"] != article["author_id"]:
            return fail("文章不存在", code=404)

    # 获取作者信息
    author = db.get_by_id("users", article["author_id"])
    article["author"] = {
        "id": author["id"] if author else None,
        "username": author.get("username") if author else None,
        "nickname": author.get("nickname") if author else None,
        "avatar_url": author.get("avatar_url") if author else None,
    }

    # 获取分类信息
    if article.get("category_id"):
        category = db.get_by_id("categories", article["category_id"])
        article["category"] = {"id": category["id"], "name": category["name"]} if category else None

    # 增加浏览次数
    try:
        db.update("articles", article_id, {"view_count": (article.get("view_count", 0) + 1)})
    except Exception:
        pass

    # 当前用户是否已点赞
    current_user = getattr(g, "current_user", None)
    article["is_liked"] = False
    if current_user:
        try:
            likes = db.query("likes", select="id", filters={"article_id": article_id, "user_id": current_user["id"]})
            article["is_liked"] = len(likes) > 0
        except Exception:
            pass

    return success(article, "查询成功")


@article_bp.route("", methods=["POST"])
@login_required
def create_article():
    """
    发布/保存文章
    请求体: {"title": "...", "content": "...", "category_id": "...",
             "tags": [...], "summary": "...", "cover_url": "...", "status": "published|draft"}
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    # 参数校验
    if err := validate_article_data(data):
        return fail(err)

    # 构建文章数据
    article_data = {
        "author_id": g.current_user["id"],
        "title": data["title"].strip(),
        "content": data["content"].strip(),
        "summary": data.get("summary", "").strip()[:500],
        "cover_url": data.get("cover_url", "").strip(),
        "category_id": data.get("category_id"),
        "tags": data.get("tags", []),
        "status": data.get("status", "published"),
    }

    new_article = db.insert("articles", article_data)
    if not new_article:
        return fail("发布文章失败")

    logger.info(f"文章发布成功: {new_article['title']} (作者={g.current_user['username']})")
    return created(new_article, "发布成功" if article_data["status"] == "published" else "草稿保存成功")


@article_bp.route("/<article_id>", methods=["PUT"])
@login_required
def update_article(article_id):
    """
    编辑文章（仅作者可操作）
    请求体: 与创建类似，只需传入要更新的字段
    """
    # 验证文章存在且为作者本人
    if not db.is_owner("articles", article_id, g.current_user["id"]):
        return fail("文章不存在或无权编辑", code=403)

    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    # 参数校验
    if err := validate_article_data(data, is_update=True):
        return fail(err)

    # 构建更新数据（只更新传入的字段）
    update_data = {}
    for field in ["title", "content", "summary", "cover_url", "category_id", "tags", "status"]:
        if field in data:
            update_data[field] = data[field]

    if not update_data:
        return fail("没有要更新的字段")

    updated = db.update("articles", article_id, update_data)
    if not updated:
        return fail("更新失败")

    logger.info(f"文章更新成功: {updated['title']} (操作者={g.current_user['username']})")
    return success(updated, "更新成功")


@article_bp.route("/<article_id>", methods=["DELETE"])
@login_required
def delete_article(article_id):
    """
    删除文章（仅作者可操作）
    级联删除关联的评论和点赞（由数据库ON DELETE CASCADE处理）
    """
    if not db.is_owner("articles", article_id, g.current_user["id"]):
        return fail("文章不存在或无权删除", code=403)

    if not db.delete("articles", article_id):
        return fail("删除失败")

    logger.info(f"文章删除成功 (id={article_id}, 操作者={g.current_user['username']})")
    return success(None, "删除成功")
