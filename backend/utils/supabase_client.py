"""
校园个人博客系统 - Supabase数据库工具类
用 requests 代替 Supabase SDK（httpx在某些网络环境会挂死）
"""
import requests
import json
import logging
from config import Config

logger = logging.getLogger(__name__)

BASE = Config.SUPABASE_URL + "/rest/v1"
HEADERS = {
    "apikey": Config.SUPABASE_SERVICE_KEY,
    "Authorization": "Bearer " + Config.SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


class SupabaseClient:
    """Supabase REST API 操作工具类"""

    def _get(self, url, params=None):
        return requests.get(url, headers={**HEADERS, "Connection": "close"}, params=params, timeout=15)

    def _post(self, url, data):
        return requests.post(url, headers={**HEADERS, "Connection": "close"}, json=data, timeout=15)

    def _patch(self, url, data):
        return requests.patch(url, headers={**HEADERS, "Connection": "close"}, json=data, timeout=15)

    def _delete(self, url):
        return requests.delete(url, headers={**HEADERS, "Connection": "close"}, timeout=15)

    # ========== 查询 ==========

    def get_by_id(self, table: str, record_id: str) -> dict | None:
        try:
            r = self._get(f"{BASE}/{table}", {"id": f"eq.{record_id}", "limit": "1"})
            data = r.json()
            return data[0] if data else None
        except Exception as e:
            logger.error(f"查询{table}失败: {e}")
            return None

    def list_all(self, table, filters=None, order_by="created_at", ascending=False):
        try:
            params = {"order": f"{order_by}.{'asc' if ascending else 'desc'}"}
            if filters:
                for k, v in filters.items():
                    params[k] = f"eq.{v}"
            r = self._get(f"{BASE}/{table}", params)
            return r.json() or []
        except Exception as e:
            logger.error(f"查询{table}列表失败: {e}")
            return []

    def paginated_query(self, table, page=1, page_size=10, filters=None,
                        search=None, search_columns=None, order_by="created_at",
                        ascending=False, select="*"):
        try:
            filter_params = {}
            if filters:
                for k, v in filters.items():
                    filter_params[k] = f"eq.{v}"
            if search and search_columns:
                or_parts = [f'{col}.ilike.%{search}%' for col in search_columns]
                filter_params["or"] = f"({','.join(or_parts)})"

            # 一次查询同时拿数据和总数（Prefer: count=exact）
            count_headers = {**HEADERS, "Prefer": "count=exact"}
            data_params = {
                "select": select,
                "order": f"{order_by}.{'asc' if ascending else 'desc'}",
                "offset": str((page - 1) * page_size),
                "limit": str(page_size),
                **filter_params
            }
            r = requests.get(f"{BASE}/{table}", headers=count_headers,
                           params=data_params, timeout=15)

            total = 0
            if "content-range" in r.headers:
                total = int(r.headers["content-range"].split("/")[-1])

            data = r.json() if r.text else []
            return {
                "list": data or [],
                "total": total or len(data),
                "page": page,
                "page_size": page_size
            }
        except Exception as e:
            logger.error(f"分页查询{table}失败: {e}")
            return {"list": [], "total": 0, "page": page, "page_size": page_size}

    # ========== CUD ==========

    def insert(self, table, data):
        try:
            r = self._post(f"{BASE}/{table}", data)
            if r.status_code in (200, 201):
                try:
                    result = r.json()
                    return (result[0] if isinstance(result, list) else result) if result else data
                except Exception:
                    return data  # 响应为空时用传入数据兜底
            logger.error(f"插入{table}失败: {r.status_code} {r.text}")
            return None
        except Exception as e:
            logger.error(f"插入{table}失败: {e}")
            return None

    def update(self, table, record_id, data):
        try:
            r = self._patch(f"{BASE}/{table}?id=eq.{record_id}", data)
            if r.status_code in (200, 204):
                if r.text:
                    result = r.json()
                    return result[0] if isinstance(result, list) else result
                return data
            return None
        except Exception as e:
            logger.error(f"更新{table}失败: {e}")
            return None

    def delete(self, table, record_id):
        try:
            r = self._delete(f"{BASE}/{table}?id=eq.{record_id}")
            return r.status_code == 200
        except Exception as e:
            logger.error(f"删除{table}失败: {e}")
            return False

    # ========== 用户 ==========

    def is_owner(self, table, record_id, user_id, owner_field="author_id"):
        record = self.get_by_id(table, record_id)
        if not record:
            return False
        return str(record.get(owner_field)) == str(user_id)

    def query(self, table, select="*", filters=None, order_by=None, ascending=False, limit=None):
        """通用查询，返回list"""
        try:
            params = {"select": select}
            if filters:
                for k, v in filters.items():
                    params[k] = f"eq.{v}"
            if order_by:
                params["order"] = f"{order_by}.{'asc' if ascending else 'desc'}"
            if limit:
                params["limit"] = str(limit)
            r = self._get(f"{BASE}/{table}", params)
            return r.json() or []
        except Exception as e:
            logger.error(f"查询{table}失败: {e}")
            return []

    def get_user_by_auth_id(self, auth_id):
        try:
            r = self._get(f"{BASE}/users", {"auth_id": f"eq.{auth_id}", "limit": "1"})
            data = r.json()
            return data[0] if data else None
        except Exception:
            return None

    # ========== 点赞 ==========

    def toggle_like(self, article_id, user_id):
        try:
            # 检查是否已点赞
            r = self._get(f"{BASE}/likes", {"article_id": f"eq.{article_id}", "user_id": f"eq.{user_id}"})
            existing = r.json()
            if existing:
                self._delete(f"{BASE}/likes?id=eq.{existing[0]['id']}")
                liked = False
            else:
                self._post(f"{BASE}/likes", {"article_id": article_id, "user_id": user_id})
                liked = True
            article = self.get_by_id("articles", article_id)
            return {"liked": liked, "like_count": article.get("like_count", 0) if article else 0}
        except Exception as e:
            logger.error(f"点赞失败: {e}")
            raise


db = SupabaseClient()