"""
校园个人博客系统 - Supabase数据库工具类
封装客户端初始化、通用CRUD、分页查询、用户权限过滤等方法
"""
from supabase import create_client, Client
from config import Config
import logging

logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase数据库操作工具类（单例模式）
    初始化时使用service_role key以绕过RLS执行服务端操作
    """

    _instance = None
    _client: Client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._client is None:
            try:
                self._client: Client = create_client(
                    Config.SUPABASE_URL,
                    Config.SUPABASE_SERVICE_KEY  # 使用service_role key
                )
                logger.info("Supabase客户端初始化成功")
            except Exception as e:
                logger.error(f"Supabase客户端初始化失败: {e}")
                raise

    # ==================== 通用查询方法 ====================

    def get_by_id(self, table: str, record_id: str) -> dict | None:
        """根据ID获取单条记录"""
        try:
            result = self._client.table(table).select("*").eq("id", record_id).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"查询{table}记录失败 (id={record_id}): {e}")
            return None

    def list_all(self, table: str, filters: dict = None, order_by: str = "created_at",
                 ascending: bool = False) -> list:
        """获取表的所有记录（支持简单过滤和排序）"""
        try:
            query = self._client.table(table).select("*")
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            # Supabase Python SDK v2.x: order() 使用 desc 参数，不再接受 ascending
            query = query.order(order_by, desc=not ascending)
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"查询{table}列表失败: {e}")
            return []

    def paginated_query(self, table: str, page: int = 1, page_size: int = 10,
                        filters: dict = None, search: str = None, search_columns: list = None,
                        order_by: str = "created_at", ascending: bool = False,
                        select: str = "*") -> dict:
        """
        通用分页查询方法

        参数:
            table:         表名
            page:          页码（从1开始）
            page_size:     每页条数
            filters:       等值过滤条件字典 {"status": "published"}
            search:        模糊搜索关键词
            search_columns:要搜索的列名列表 ["title", "summary"]
            order_by:      排序字段
            ascending:     是否升序
            select:        选择字段，默认"*"

        返回:
            {"list": [...], "total": int, "page": int, "page_size": int}
        """
        try:
            # 构建基础查询
            query = self._client.table(table).select(select, count="exact")

            # 等值过滤
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)

            # 模糊搜索（对多个列进行OR搜索）
            if search and search_columns:
                # Supabase的or查询：对每个列构建模糊匹配
                or_filters = ",".join(
                    [f'{col}.ilike.%{search}%' for col in search_columns]
                )
                query = query.or_(or_filters)

            # 计算分页范围
            start = (page - 1) * page_size
            end = start + page_size - 1

            # 执行查询（Supabase SDK v2.x: order() 使用 desc 参数）
            result = query.order(order_by, desc=not ascending).range(start, end).execute()

            return {
                "list": result.data or [],
                "total": result.count or 0,
                "page": page,
                "page_size": page_size
            }
        except Exception as e:
            logger.error(f"分页查询{table}失败: {e}")
            return {"list": [], "total": 0, "page": page, "page_size": page_size}

    # ==================== 通用CUD方法 ====================

    def insert(self, table: str, data: dict) -> dict | None:
        """插入一条记录，返回插入后的数据"""
        try:
            result = self._client.table(table).insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"插入{table}记录失败: {e}")
            return None

    def update(self, table: str, record_id: str, data: dict) -> dict | None:
        """根据ID更新一条记录，返回更新后的数据"""
        try:
            result = self._client.table(table).update(data).eq("id", record_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"更新{table}记录失败 (id={record_id}): {e}")
            return None

    def delete(self, table: str, record_id: str) -> bool:
        """根据ID删除一条记录，返回是否成功"""
        try:
            result = self._client.table(table).delete().eq("id", record_id).execute()
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            logger.error(f"删除{table}记录失败 (id={record_id}): {e}")
            return False

    # ==================== 用户权限验证方法 ====================

    def is_owner(self, table: str, record_id: str, user_id: str, owner_field: str = "author_id") -> bool:
        """
        验证当前用户是否为记录的所有者
        用于文章/评论的编辑删除权限判断
        """
        record = self.get_by_id(table, record_id)
        if not record:
            return False
        return str(record.get(owner_field)) == str(user_id)

    def get_user_by_auth_id(self, auth_id: str) -> dict | None:
        """通过Supabase auth_id获取用户信息（不使用.single()避免406）"""
        try:
            result = self._client.table("users").select("*").eq("auth_id", auth_id).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception:
            return None

    # ==================== 点赞去重方法 ====================

    def toggle_like(self, article_id: str, user_id: str) -> dict:
        """
        点赞/取消点赞切换方法
        如果已点赞则取消，未点赞则点赞
        返回: {"liked": True/False, "like_count": int}
        """
        try:
            # 检查是否已点赞
            existing = self._client.table("likes").select("*") \
                .eq("article_id", article_id) \
                .eq("user_id", user_id) \
                .execute()

            if existing.data:
                # 已点赞 → 取消点赞
                self._client.table("likes").delete() \
                    .eq("article_id", article_id) \
                    .eq("user_id", user_id) \
                    .execute()
                liked = False
            else:
                # 未点赞 → 点赞
                self._client.table("likes").insert({
                    "article_id": article_id,
                    "user_id": user_id
                }).execute()
                liked = True

            # 获取最新点赞数（触发器已自动更新）
            article = self.get_by_id("articles", article_id)
            like_count = article.get("like_count", 0) if article else 0

            return {"liked": liked, "like_count": like_count}
        except Exception as e:
            logger.error(f"点赞操作失败: {e}")
            raise


# 导出全局单例
db = SupabaseClient()
