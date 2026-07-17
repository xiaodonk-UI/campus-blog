"""
校园个人博客系统 - 用户模块路由
包含：注册、登录、获取用户信息、修改个人信息/头像
"""
from flask import Blueprint, request, g
from utils.response import success, created, fail
from utils.auth import login_required
from utils.supabase_client import db
from config import Config
import re
import random
import logging

logger = logging.getLogger(__name__)

# 创建用户模块蓝图，URL前缀 /api/user
user_bp = Blueprint("user", __name__, url_prefix="/api/user")


# ==================== 参数校验工具 ====================

def validate_username(username: str) -> str | None:
    """校验用户名：3-20位字母数字下划线"""
    if not username or len(username) < 3 or len(username) > 20:
        return "用户名长度需在3-20个字符之间"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return "用户名只能包含字母、数字和下划线"
    return None


def validate_password(password: str) -> str | None:
    """校验密码：6-32位"""
    if not password or len(password) < 6 or len(password) > 32:
        return "密码长度需在6-32个字符之间"
    return None


# ==================== 用户路由 ====================

@user_bp.route("/register", methods=["POST"])
def register():
    """
    用户注册接口
    请求体: {"username": "...", "password": "...", "email": "..."}
    流程：Supabase Auth注册 → 在users表中创建记录
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    email = (data.get("email") or "").strip()
    nickname = (data.get("nickname") or "").strip() or username

    # 参数校验
    if err := validate_username(username):
        return fail(err)
    if err := validate_password(password):
        return fail(err)
    if not email or "@" not in email:
        return fail("请输入有效的邮箱地址")

    try:
        # 使用 Supabase Auth REST API 注册
        import requests
        auth_url = f"{Config.SUPABASE_URL}/auth/v1/signup"
        auth_headers = {"apikey": Config.SUPABASE_KEY, "Content-Type": "application/json"}
        auth_resp = requests.post(auth_url, json={
            "email": email, "password": password,
            "data": {"username": username}
        }, headers=auth_headers, timeout=15)

        if auth_resp.status_code != 200:
            err = auth_resp.json()
            return fail(err.get("msg", "注册失败"))

        auth_data = auth_resp.json()
        auth_id = auth_data["user"]["id"]

        # 在users表中创建用户记录（失败不阻断注册，仅记日志）
        try:
            user_data = {"auth_id": auth_id, "username": username, "nickname": nickname}
            new_user = db.insert("users", user_data)
            if not new_user:
                logger.error(f"users表插入失败: username={username}, auth_id={auth_id}")
        except Exception as e:
            logger.error(f"users表插入异常: {e}")

        logger.info(f"新用户注册成功: {username}（验证邮件已发送）")
        return created({
            "tip": "验证邮件已发送，请前往邮箱确认完成注册"
        }, "验证邮件已发送")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"注册异常: {error_msg}")
        if "already" in error_msg.lower() or "duplicate" in error_msg.lower():
            return fail("该用户名或邮箱已被注册")
        return fail(f"注册失败: {error_msg}")


@user_bp.route("/login", methods=["POST"])
def login():
    """
    用户登录接口
    请求体: {"email": "...", "password": "..."}
    返回: {"token": "...", "user": {...}}
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    email = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email:
        return fail("请输入邮箱")
    if not password:
        return fail("请输入密码")

    try:
        # 使用 Supabase Auth REST API 登录
        import requests
        auth_url = f"{Config.SUPABASE_URL}/auth/v1/token?grant_type=password"
        auth_headers = {"apikey": Config.SUPABASE_KEY, "Content-Type": "application/json"}
        auth_resp = requests.post(auth_url, json={
            "email": email, "password": password
        }, headers=auth_headers, timeout=15)

        if auth_resp.status_code != 200:
            return fail("邮箱或密码错误")

        auth_data = auth_resp.json()
        auth_id = auth_data["user"]["id"]
        token = auth_data["access_token"]
        refresh_token = auth_data["refresh_token"]

        # 查询或创建用户记录
        user = db.get_user_by_auth_id(auth_id)
        if not user:
            raw_username = auth_data["user"].get("user_metadata", {}).get("username", "")
            username = raw_username or email.split("@")[0]
            for attempt in range(3):
                suffix = f"_{random.randint(1000, 9999)}" if attempt > 0 else ""
                try_name = username + suffix if attempt > 0 else username
                new_user = db.insert("users", {
                    "auth_id": auth_id, "username": try_name,
                    "nickname": raw_username or username,
                })
                if new_user:
                    user = new_user
                    break
                elif attempt == 2:
                    existing = db.list_all("users", {"username": username})
                    if existing:
                        db.delete("users", existing[0]["id"])
                    new_user = db.insert("users", {
                        "auth_id": auth_id, "username": username,
                        "nickname": raw_username or username,
                    })
                    if new_user:
                        user = new_user
                        break

        if not user:
            return fail("用户数据异常")

        logger.info(f"用户登录成功: {user['username']}")
        return success({"token": token, "refresh_token": refresh_token, "user": user}, "登录成功")

    except Exception as e:
        logger.warning(f"登录失败: {e}")
        return fail("邮箱或密码错误")


@user_bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    """
    获取当前登录用户信息
    鉴权后从g.current_user获取
    """
    return success(g.current_user, "获取用户信息成功")


@user_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    """
    修改个人信息（昵称、简介、头像URL）
    请求体: {"nickname": "...", "bio": "...", "avatar_url": "..."}
    注意：头像上传采用Supabase Storage，前端上传后获取URL传入此接口
    """
    data = request.get_json(silent=True)
    if not data:
        return fail("请求体不能为空")

    user_id = g.current_user["id"]
    update_data = {}

    # 只更新传入的字段
    if "nickname" in data:
        nickname = data["nickname"].strip()
        if not nickname or len(nickname) > 50:
            return fail("昵称长度需在1-50个字符之间")
        update_data["nickname"] = nickname

    if "bio" in data:
        bio = data["bio"].strip()
        if len(bio) > 500:
            return fail("个人简介不超过500个字符")
        update_data["bio"] = bio

    if "avatar_url" in data:
        update_data["avatar_url"] = data["avatar_url"].strip()

    if not update_data:
        return fail("没有要更新的字段")

    updated = db.update("users", user_id, update_data)
    if not updated:
        return fail("更新失败")

    logger.info(f"用户信息更新成功: {g.current_user['username']}")
    return success(updated, "更新成功")


@user_bp.route("/avatar", methods=["POST"])
@login_required
def upload_avatar():
    """上传头像（接受图片文件，转base64存数据库）"""
    if "file" not in request.files:
        return fail("请选择图片文件")
    file = request.files["file"]
    if not file.filename:
        return fail("请选择图片文件")
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        return fail("仅支持 JPG、PNG、GIF、WebP 格式")
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > 2 * 1024 * 1024:
        return fail("图片大小不能超过2MB")
    try:
        import base64
        data = file.read()
        b64 = base64.b64encode(data).decode()
        url = f"data:{file.content_type};base64,{b64}"
        updated = db.update("users", g.current_user["id"], {"avatar_url": url})
        return success({"avatar_url": url}, "头像上传成功") if updated else fail("更新失败")
    except Exception as e:
        logger.error(f"头像上传失败: {e}")
        return fail("头像上传失败")


@user_bp.route("/public/<user_id>", methods=["GET"])
def get_public_user(user_id):
    """
    获取指定用户的公开信息（无需登录）
    用于文章详情页展示作者信息
    """
    user = db.get_by_id("users", user_id)
    if not user:
        return fail("用户不存在", code=404)

    # 仅返回公开字段
    public_info = {
        "id": user["id"],
        "username": user.get("username"),
        "nickname": user.get("nickname"),
        "avatar_url": user.get("avatar_url"),
        "bio": user.get("bio"),
    }
    return success(public_info)
