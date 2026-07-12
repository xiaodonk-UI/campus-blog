"""
校园个人博客系统 - 统一响应格式封装
所有接口返回格式：{"code": 状态码, "msg": 提示信息, "data": 返回数据}
"""
from flask import jsonify


def success(data=None, msg="操作成功"):
    """成功响应（code=200）"""
    return jsonify({"code": 200, "msg": msg, "data": data})


def created(data=None, msg="创建成功"):
    """创建成功响应（code=201）"""
    return jsonify({"code": 201, "msg": msg, "data": data}), 201


def fail(msg="请求失败", code=400):
    """客户端错误响应"""
    return jsonify({"code": code, "msg": msg, "data": None}), code


def unauthorized(msg="请先登录"):
    """未登录/鉴权失败响应（code=401）"""
    return jsonify({"code": 401, "msg": msg, "data": None}), 401


def forbidden(msg="权限不足"):
    """无权限响应（code=403）"""
    return jsonify({"code": 403, "msg": msg, "data": None}), 403


def not_found(msg="资源不存在"):
    """资源未找到响应（code=404）"""
    return jsonify({"code": 404, "msg": msg, "data": None}), 404


def server_error(msg="服务器内部错误"):
    """服务器错误响应（code=500）"""
    return jsonify({"code": 500, "msg": msg, "data": None}), 500


def paginated_list(items, total, page, page_size):
    """分页列表响应，将分页信息包装在data中"""
    return jsonify({
        "code": 200,
        "msg": "查询成功",
        "data": {
            "list": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 0
        }
    })
