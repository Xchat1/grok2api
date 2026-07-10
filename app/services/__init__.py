"""应用服务层（service layer）。

组织约定：
- 包根仅保留跨域共享服务：``base``（BaseService 基类）、``api_keys``（API 密钥管理）。
- 按业务域划分的子包：
  - ``admin``    —— 后台管理（配置、令牌管理）
  - ``metrics``  —— 指标与配额（请求统计、每日配额）
  - ``grok``     —— Grok 上游服务封装
  - ``register`` —— 账号自动注册
  - ``token``    —— 令牌池与刷新调度
"""
