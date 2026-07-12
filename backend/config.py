"""
校园个人博客系统 - 配置中心
统一管理所有环境变量和应用配置
"""
import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()


class Config:
    """应用全局配置"""

    # ========== Flask 基础配置 ==========
    SECRET_KEY = os.getenv("SECRET_KEY", "campus-blog-secret-key-2024")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"

    # ========== Supabase 配置 ==========
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")          # anon/public key
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # service_role key（后端使用）

    # ========== JWT 配置（Supabase Auth 签发 Token 的签名密钥）==========
    # 获取方式：Supabase Dashboard → Settings → API → JWT Settings → JWT Secret
    JWT_SECRET = os.getenv("JWT_SECRET", "")

    # ========== 分页默认配置 ==========
    PAGE_SIZE_DEFAULT = 10   # 默认每页条数
    PAGE_SIZE_MAX = 50       # 最大每页条数

    # ========== 上传配置 ==========
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

    # ========== CORS跨域配置 ==========
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
