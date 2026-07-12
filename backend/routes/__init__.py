"""
校园个人博客系统 - 路由蓝图注册中心
统一创建蓝图并注册到Flask应用
"""
from flask import Blueprint, Flask
from routes.user import user_bp
from routes.article import article_bp
from routes.interaction import interaction_bp


def register_routes(app: Flask):
    """
    向Flask应用注册所有路由蓝图
    所有API路由统一使用 /api 前缀
    """
    # 注册用户模块路由：  /api/user/*
    app.register_blueprint(user_bp)

    # 注册文章模块路由：  /api/articles/*
    app.register_blueprint(article_bp)

    # 注册互动模块路由：  /api/*
    app.register_blueprint(interaction_bp)
