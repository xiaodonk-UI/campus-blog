"""
校园个人博客系统 - 互动模块路由
包含：新增评论、分页获取评论、删除评论、点赞/取消点赞
"""
from flask import Blueprint, request, g
from utils.response import success, created, fail, paginated_list
from utils.auth import login_required
from utils.supabase_client import db
from config import Config
import logging

logger = logging.getLogger(__name__)

# 创建互动模块蓝图
interaction_bp = Blueprint("interaction", __name__, url_prefix="/api")


# ==================== 评论路由 ====================

@interaction_bp.route("/comments", methods=["POST"])
@login_required
def create_comment():
    """
    发表评论
    请求体: {"article_id": "...", "content": "..."}
    要求：登录用户、文章存在且已发布
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    article_id = data.get("article_id")
    content = (data.get("content") or "").strip()

    # 参数校验
    if not article_id:
        return fail("文章ID不能为空")
    if not content:
        return fail("评论内容不能为空")
    if len(content) > 2000:
        return fail("评论内容不超过2000个字符")

    # 验证文章存在
    article = db.get_by_id("articles", article_id)
    if not article:
        return fail("文章不存在", code=404)

    # 构建评论数据
    comment_data = {
        "article_id": article_id,
        "user_id": g.current_user["id"],
        "content": content,
    }

    new_comment = db.insert("comments", comment_data)
    if not new_comment:
        return fail("评论失败")

    # 附带用户信息返回
    new_comment["user"] = {
        "id": g.current_user["id"],
        "username": g.current_user.get("username"),
        "nickname": g.current_user.get("nickname"),
        "avatar_url": g.current_user.get("avatar_url"),
    }

    logger.info(f"评论成功: 用户={g.current_user['username']}, 文章={article_id}")
    return created(new_comment, "评论成功")


@interaction_bp.route("/comments/<article_id>", methods=["GET"])
def list_comments(article_id):
    """
    分页获取文章评论列表
    查询参数: page, page_size
    按时间正序排列
    """
    # 验证文章存在
    article = db.get_by_id("articles", article_id)
    if not article:
        return fail("文章不存在", code=404)

    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", Config.PAGE_SIZE_DEFAULT, type=int)
    page = max(1, page)
    page_size = min(max(1, page_size), Config.PAGE_SIZE_MAX)

    # 查询评论并关联用户信息
    result = db.paginated_query(
        table="comments",
        page=page,
        page_size=page_size,
        filters={"article_id": article_id},
        order_by="created_at",
        ascending=True,  # 评论按时间正序
        select="*, users!comments_user_id_fkey(id, username, nickname, avatar_url)"
    )

    return paginated_list(result["list"], result["total"], page, page_size)


@interaction_bp.route("/comments/<comment_id>", methods=["DELETE"])
@login_required
def delete_comment(comment_id):
    """
    删除评论（仅评论作者可操作）
    """
    if not db.is_owner("comments", comment_id, g.current_user["id"], owner_field="user_id"):
        return fail("评论不存在或无权删除", code=403)

    if not db.delete("comments", comment_id):
        return fail("删除失败")

    logger.info(f"评论删除成功 (id={comment_id}, 操作者={g.current_user['username']})")
    return success(None, "删除成功")


# ==================== 点赞路由 ====================

@interaction_bp.route("/likes", methods=["POST"])
@login_required
def toggle_like():
    """
    点赞/取消点赞切换接口
    请求体: {"article_id": "..."}
    返回: {"liked": true/false, "like_count": int}
    同一用户对同一文章只能点赞一次，再次请求则取消点赞
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    article_id = data.get("article_id")
    if not article_id:
        return fail("文章ID不能为空")

    # 验证文章存在
    article = db.get_by_id("articles", article_id)
    if not article:
        return fail("文章不存在", code=404)

    try:
        result = db.toggle_like(article_id, g.current_user["id"])
        action = "点赞" if result["liked"] else "取消点赞"
        logger.info(f"{action}成功: 用户={g.current_user['username']}, 文章={article_id}")
        return success(result, f"{action}成功")
    except Exception as e:
        logger.error(f"点赞操作失败: {e}")
        return fail("操作失败，请稍后重试")
