"""Admin 路由包。

将原本单一的 app/api/v1/admin.py（约 1277 行）按职责拆分为多个子模块，
在此聚合为一个统一的 `router`，保持对外路由路径与 main.py 的导入方式不变。
"""

from fastapi import APIRouter

from .pages import router as pages_router
from .auth import router as auth_router
from .config_routes import router as config_router
from .keys import router as keys_router
from .tokens import router as tokens_router
from .imagine_ws import router as imagine_ws_router
from .cache import router as cache_router
from .metrics import router as metrics_router

router = APIRouter()
router.include_router(pages_router)
router.include_router(auth_router)
router.include_router(config_router)
router.include_router(keys_router)
router.include_router(tokens_router)
router.include_router(imagine_ws_router)
router.include_router(cache_router)
router.include_router(metrics_router)

__all__ = ["router"]
