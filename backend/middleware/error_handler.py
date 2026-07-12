"""
校园个人博客系统 - 全局异常捕获中间件
统一捕获所有未处理异常，返回标准JSON格式错误响应
"""
import logging
from flask import Flask
from utils.response import server_error, fail

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask):
    """
    向Flask应用注册全局错误处理器
    覆盖常见的HTTP错误码和通用Exception
    """

    @app.errorhandler(400)
    def bad_request(error):
        """请求参数错误"""
        return fail(msg="请求参数不正确", code=400)

    @app.errorhandler(404)
    def not_found(error):
        """路由不存在"""
        return fail(msg="请求的资源不存在", code=404)

    @app.errorhandler(405)
    def method_not_allowed(error):
        """请求方法不允许"""
        return fail(msg="请求方法不支持", code=405)

    @app.errorhandler(413)
    def payload_too_large(error):
        """请求体过大"""
        return fail(msg="上传文件过大，请控制在16MB以内", code=413)

    @app.errorhandler(500)
    def internal_error(error):
        """服务器内部错误"""
        logger.error(f"服务器内部错误: {error}", exc_info=True)
        return server_error("服务器繁忙，请稍后重试")

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        """兜底：捕获所有未处理的异常"""
        logger.error(f"未捕获的异常: {error}", exc_info=True)
        return server_error("服务器内部异常，请联系管理员")
