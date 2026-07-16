"""
校园个人博客系统 - Vercel Serverless 入口
将 Flask WSGI 应用包装为 Vercel Python Runtime 可调用的 handler
"""
import sys
import os
import json

# 将 backend/ 目录加入 Python 路径，确保能 import app / config / utils / routes
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app import app  # Flask 应用实例


def handler(event, context):
    """
    Vercel Python Runtime 入口函数
    event: { method, path, query, headers, body, ... }
    """
    from io import BytesIO

    # 提取请求信息
    method = event.get("method", "GET")
    path = event.get("path", "/")
    query = event.get("query", "")
    headers = event.get("headers", {})
    body = event.get("body", b"")

    # 处理 body 类型
    if isinstance(body, str):
        body = body.encode("utf-8")
    elif body is None:
        body = b""

    # 构建 WSGI 环境字典
    environ = {
        "REQUEST_METHOD": method,
        "PATH_INFO": path,
        "QUERY_STRING": query,
        "SERVER_NAME": "vercel",
        "SERVER_PORT": "443",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "https",
        "wsgi.input": BytesIO(body),
        "wsgi.errors": BytesIO(),
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
        "wsgi.run_once": True,
    }

    # 转接头信息
    for key, value in headers.items():
        http_key = "HTTP_" + key.upper().replace("-", "_")
        if http_key not in ("HTTP_CONTENT_TYPE", "HTTP_CONTENT_LENGTH"):
            environ[http_key] = value
    if "content-type" in headers:
        environ["CONTENT_TYPE"] = headers["content-type"]
    if "content-length" in headers:
        environ["CONTENT_LENGTH"] = headers["content-length"]

    # 收集 WSGI 响应
    response_body = []
    response_status = "200 OK"
    response_headers = []

    def start_response(status, headers_list, exc_info=None):
        nonlocal response_status, response_headers
        response_status = status
        response_headers = headers_list

    # 执行 Flask WSGI 应用
    result = app(environ, start_response)
    for chunk in result:
        response_body.append(chunk)

    # 组装返回
    status_code = int(response_status.split(" ")[0])
    headers_dict = dict(response_headers)

    return {
        "statusCode": status_code,
        "headers": headers_dict,
        "body": b"".join(response_body).decode("utf-8"),
    }