# Ubuntu VPS 快速部署 Grok2API

在 Ubuntu VPS 上最快方式：**Docker Compose 一键启动**（无需安装 Python/Node）。

## 一、安装 Docker（若未安装）

```bash
# 使用官方一键脚本
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录 SSH 或执行
newgrp docker
```

## 二、克隆并启动（约 1 分钟）

```bash
git clone https://github.com/TQZHR/grok2api.git
cd grok2api

# 直接拉取镜像并后台运行（默认端口 8788）
docker compose up -d
```

## 三、访问与配置

- **管理后台**：`http://<你的VPS公网IP>:8788/login`  
  默认账号/密码：`admin` / `admin`（上线后务必在「配置管理」中修改）
- **API 基础地址**：`http://<你的VPS公网IP>:8788`  
  调用时需在「API Key 管理」中创建 Key，或使用配置里的 `api_key`（默认 `data/config.toml` 中可改）

## 四、可选：改端口或环境变量

```bash
cp .env.example .env
# 编辑 .env，例如改端口为 80：
# GROK2API_PORT=80
# 然后重启
docker compose up -d
```

## 五、更新到最新版

```bash
cd grok2api
docker compose pull
docker compose up -d
```

## 六、若拉取镜像报错 `denied`

说明 GHCR 镜像需登录或不可匿名拉取，可改为从源码构建：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

---

**数据持久化**：`./data` 与 `./logs` 已挂载到容器，升级或重启不会丢失配置与 Token。
