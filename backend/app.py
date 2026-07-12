"""
校园个人博客系统 - Flask应用入口
包含：CORS跨域配置、全局响应统一封装、全局异常捕获、路由注册
启动命令：python app.py
"""
from flask import Flask
from flask_cors import CORS
from config import Config
from routes import register_routes
from middleware.error_handler import register_error_handlers
import logging
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """
    应用工厂函数：创建并配置Flask应用实例
    集中完成所有初始化操作
    """
    # 创建Flask应用
    app = Flask(__name__)

    # 加载配置
    app.config.from_object(Config)

    # 确保上传目录存在
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # ---- CORS跨域配置 ----
    CORS(app, resources={
        r"/api/*": {
            "origins": Config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })

    # ---- 注册全局错误处理器 ----
    register_error_handlers(app)

    # ---- 注册所有路由蓝图 ----
    register_routes(app)

    # ---- 健康检查接口 ----
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """健康检查接口，用于部署验证"""
        return {"code": 200, "msg": "服务运行正常", "data": None}

    logger.info("Flask应用初始化完成")
    return app


# 创建应用实例（供 gunicorn 等 WSGI 服务器使用）
app = create_app()


# ==================== 直接运行入口 ====================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"启动开发服务器: http://localhost:{port}")
    app.run(
        host="0.0.0.0",
        port=port,
        debug=Config.DEBUG
    )
