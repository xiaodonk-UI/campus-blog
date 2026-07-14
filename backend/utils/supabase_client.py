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
}


class SupabaseClient:
    """Supabase REST API 操作工具类"""

    def _get(self, url, params=None):
        return requests.get(url, headers=HEADERS, params=params, timeout=15)

    def _post(self, url, data):
        return requests.post(url, headers=HEADERS, json=data, timeout=15)

    def _patch(self, url, data):
        return requests.patch(url, headers=HEADERS, json=data, timeout=15)

    def _delete(self, url):
        return requests.delete(url, headers=HEADERS, timeout=15)

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
            params = {
                "select": select,
                "order": f"{order_by}.{'asc' if ascending else 'desc'}",
                "offset": str((page - 1) * page_size),
                "limit": str(page_size),
            }
            # 等值过滤
            if filters:
                for k, v in filters.items():
                    params[k] = f"eq.{v}"
            # 模糊搜索
            if search and search_columns:
                or_parts = [f'{col}.ilike.%{search}%' for col in search_columns]
                params["or"] = f"({','.join(or_parts)})"

            # 查数据
            r = self._get(f"{BASE}/{table}", params)

            # 查总数
            count_params = {"select": "id"}
            if filters:
                for k, v in filters.items():
                    count_params[k] = f"eq.{v}"
            # Supabase count用Prefer头
            count_headers = {**HEADERS, "Prefer": "count=exact"}
            cr = requests.get(f"{BASE}/{table}", headers=count_headers,
                            params={"select": "id", **{k: count_params.get(k, "") for k in count_params if k != "select"}})

            # 修正count参数
            count_final = {}
            if filters:
                for k, v in filters.items():
                    count_final[k] = f"eq.{v}"
            cr2 = requests.get(f"{BASE}/{table}", headers=count_headers,
                             params={"select": "id", **count_final})
            total = int(cr2.headers.get("content-range", "0/0").split("/")[-1]) if "content-range" in cr2.headers else 0

            return {
                "list": r.json() or [],
                "total": total,
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
            result = r.json()
            return result[0] if isinstance(result, list) else result
        except Exception as e:
            logger.error(f"插入{table}失败: {e}")
            return None

    def update(self, table, record_id, data):
        try:
            r = self._patch(f"{BASE}/{table}?id=eq.{record_id}", data)
            return r.text and (r.json() or None)
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