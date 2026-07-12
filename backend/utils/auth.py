"""
校园个人博客系统 - 鉴权装饰器
从请求头中提取并验证Supabase JWT Token，注入当前用户信息
Supabase新版默认使用ES256算法（非对称加密），通过JWKS获取公钥验证
"""
from functools import wraps
from flask import request, g
from utils.response import unauthorized, fail
from utils.supabase_client import db
from config import Config
import jwt
from jwt import PyJWKClient
import logging

logger = logging.getLogger(__name__)

# Supabase JWKS 端点（ES256公钥获取地址）
JWKS_URL = f"{Config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# 全局JWKS客户端（自动缓存公钥，定期刷新）
_jwks_client = None


def _get_jwks_client():
    """获取JWKS客户端（懒加载单例，避免重复创建）"""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)
        logger.info(f"JWKS客户端初始化: {JWKS_URL}")
    return _jwks_client


def _decode_token(token: str) -> dict | None:
    """
    解码并验证Supabase JWT Token
    ES256算法：通过Supabase JWKS端点获取公钥验证
    返回payload字典，验证失败返回None
    """
    try:
        # 获取JWKS客户端，根据Token的kid找到匹配的公钥
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # 使用公钥验证Token（跳过audience校验，Supabase默认aud为"authenticated"）
        payload = jwt.decode(
            token,
            key=signing_key.key,
            algorithms=["ES256"],
            options={"verify_exp": True, "verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token已过期")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token验证失败: {e}")
        return None
    except Exception as e:
        logger.error(f"鉴权异常: {e}")
        return None


def login_required(f):
    """
    登录鉴权装饰器
    从Authorization头提取Bearer Token → 验证JWT → 查询users表 → 注入g.current_user
    鉴权失败返回401
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # 从请求头中提取Token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        if not token:
            logger.warning("请求缺少Authorization头")
            return unauthorized("请先登录，缺少认证Token")

        # 解码验证Token
        payload = _decode_token(token)
        if payload is None:
            logger.warning("鉴权失败: Token解码返回None")
            return unauthorized("登录已过期或Token无效，请重新登录")

        # 从JWT中提取auth_id（Supabase的sub字段）
        auth_id = payload.get("sub")
        logger.info(f"鉴权: Token中auth_id={auth_id}")
        if not auth_id:
            return unauthorized("Token无效，缺少用户标识")

        # 从users表中查询当前用户
        current_user = db.get_user_by_auth_id(auth_id)
        logger.info(f"鉴权: get_user_by_auth_id结果={current_user is not None}")
        if not current_user:
            logger.warning(f"鉴权失败: users表中未找到auth_id={auth_id}的用户")
            return unauthorized("用户不存在，请重新登录")

        # 注入到Flask g对象，供后续路由使用
        g.current_user = current_user
        logger.info(f"鉴权成功: user_id={current_user.get('id')}, username={current_user.get('username')}")

        return f(*args, **kwargs)
    return decorated


def optional_login(f):
    """
    可选登录装饰器
    如果携带有效Token则注入g.current_user，未登录也不报错
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        token = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        if token:
            payload = _decode_token(token)
            if payload:
                auth_id = payload.get("sub")
                if auth_id:
                    current_user = db.get_user_by_auth_id(auth_id)
                    if current_user:
                        g.current_user = current_user

        return f(*args, **kwargs)
    return decorated