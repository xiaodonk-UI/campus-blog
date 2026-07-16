"""
Vercel Serverless 入口 — 包装 backend/ Flask 应用
所有 /api/* 请求由 Vercel 自动转发到此函数
"""
import sys, os

# 将 backend/ 加入 Python 搜索路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import app  # Flask 实例


def handler(event, context):
    from io import BytesIO

    method = event.get("method", "GET")
    path   = event.get("path", "/")
    query  = event.get("query", "")
    headers = event.get("headers", {})
    body   = event.get("body", b"") or b""
    if isinstance(body, str):
        body = body.encode()

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
    for k, v in headers.items():
        hk = "HTTP_" + k.upper().replace("-", "_")
        if hk not in ("HTTP_CONTENT_TYPE", "HTTP_CONTENT_LENGTH"):
            environ[hk] = v
    if "content-type" in headers:
        environ["CONTENT_TYPE"] = headers["content-type"]

    resp_body, resp_status, resp_headers = [], "200 OK", []

    def start_response(status, hdrs, exc=None):
        nonlocal resp_status, resp_headers
        resp_status = status
        resp_headers = hdrs

    for chunk in app(environ, start_response):
        resp_body.append(chunk)

    return {
        "statusCode": int(resp_status.split()[0]),
        "headers": dict(resp_headers),
        "body": b"".join(resp_body).decode(),
    }