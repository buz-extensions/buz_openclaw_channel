# Buz Channel 扩展安装与运行指南

本文档指引你如何在已安装 OpenClaw 的环境中，安装、配置并运行 Buz Channel 扩展。

---

## 📋 前提条件

- ✅ OpenClaw 已安装并可以正常运行
- ✅ Node.js 18+ 和 npm/pnpm
- ✅ Buz-dc-ai gRPC 服务端已部署或可访问

---

## 1️⃣ 安装扩展

### 方式一：本地开发模式（推荐）

将扩展链接到 OpenClaw 的 extensions 目录：

```bash
# 1. 进入 OpenClaw 的 extensions 目录
cd /path/to/openclaw/extensions

# 2. 创建符号链接（macOS/Linux）
ln -s /path/to/openclaw/extensions/buz_openclaw_channel buz

# 3. 或使用绝对路径（如果上述不行）
ln -s $(pwd)/buz_openclaw_channel buz
```

### 方式二：直接复制

```bash
# 复制扩展到 OpenClaw 目录
cp -r extensions/buz_openclaw_channel /path/to/openclaw/extensions/buz
```

### 方式三：通过 OpenClaw CLI 安装（如果已发布到 npm）

```bash
openclaw extension install @openclaw/buz
```

---

## 2️⃣ 安装依赖

```bash
# 进入扩展目录
cd /path/to/openclaw/extensions/buz

# 安装依赖
npm install

# 或使用 pnpm（推荐）
pnpm install
```

依赖包括：
- `@grpc/grpc-js`: gRPC 客户端
- `@grpc/proto-loader`: Protocol Buffer 加载器
- `zod`: 配置校验

---

## 3️⃣ 配置 OpenClaw

### 找到配置文件

OpenClaw 配置文件通常位于：

```bash
# macOS
~/Library/Application Support/openclaw/config.yaml

# Linux
~/.config/openclaw/config.yaml

# Windows
%APPDATA%\openclaw\config.yaml
```

### 添加 Buz Channel 配置

编辑 `config.yaml`，添加以下内容：

```yaml
# ============================================
# Buz Channel 配置
# ============================================
channels:
  buz:
    enabled: true
    
    # 账户配置（支持多账号）
    accounts:
      # 默认账号
      default:
        enabled: true
        # gRPC 服务端地址
        serverUrl: "buz-dc-ai-grpc-test.yfxn.lzpsap1.com:443"
        # 或本地测试: "localhost:9091"
        
        # 接入密钥（联系管理员获取）
        secretKey: "buz_sk_your_secret_key_here"
        
        # 账号显示名称
        name: "Buz Test"
        
        # 可选：用户白名单（只允许这些用户与 AI 对话）
        # 如果注释掉或为空，则允许所有用户
        allowFrom:
          - "user:123456789"
        
        # 私信安全策略
        dm:
          policy: "allowlist"  # 可选: allowlist | blocklist | open
          allowFrom:
            - "user:123456789"
        
        # 群组策略
        groupPolicy: "open"  # 可选: allowlist | open

# ============================================
# Agent 配置（示例）
# ============================================
agents:
  default:
    name: "Buz AI Assistant"
    instructions: |
      你是 Buz IM 平台的 AI 助手，通过 gRPC 连接与用户对话。
      你可以帮助用户解答问题、处理任务。
    
    # 关联到 buz channel
    channels:
      buz:
        enabled: true
        account: default  # 使用上面配置的 default 账号
```

### 环境变量方式（可选）

你也可以通过环境变量设置敏感信息：

```bash
export BUZ_SERVER_URL="buz-dc-ai.example.com:443"
export BUZ_SECRET_KEY="buz_sk_your_secret_key"
```

然后在 `config.yaml` 中引用：

```yaml
channels:
  buz:
    accounts:
      default:
        serverUrl: ${BUZ_SERVER_URL}
        secretKey: ${BUZ_SECRET_KEY}
```

---

## 4️⃣ 验证安装

### 检查扩展是否被识别

```bash
# 列出所有已安装的扩展
openclaw extensions list

# 你应该能看到 buz 扩展
# buz @openclaw/buz 1.0.0
```

### 验证配置

```bash
# 验证配置文件语法
openclaw config validate

# 检查 buz channel 配置
openclaw config get channels.buz
```

---

## 5️⃣ 启动运行

### 方式一：直接启动（前台运行）

```bash
# 启动 OpenClaw 并加载 buz channel
openclaw --channel buz

# 或启动所有 channel
openclaw

# 带调试日志
openclaw --channel buz --verbose

# 或设置环境变量
DEBUG=buz openclaw --channel buz
```

### 方式二：后台运行

```bash
# 使用 pm2（推荐）
pm2 start openclaw -- --channel buz

# 或使用 nohup
nohup openclaw --channel buz > openclaw.log 2>&1 &
```

### 方式三：开发模式（热重载）

```bash
# 在扩展目录
watch -n 1 'openclaw --channel buz'
```

---

## 6️⃣ 验证连接

### 查看日志

启动后，你应该能看到类似以下的日志：

```
[OpenClaw] Starting up...
[Buz] Account default configured: buz-dc-ai.example.com:443
[Buz] Connecting to gRPC server...
[Buz gRPC] Connected to buz-dc-ai.example.com:443
[Buz] Account default connected successfully
[OpenClaw] Channel buz is ready
```

### 检查状态

```bash
# 查看 channel 状态
openclaw status

# 预期输出：
# Channels:
#   buz: connected (1 account)
```

### 测试消息收发

#### 从 IM 发送消息到 OpenClaw

1. 在 Buz IM 中向 AI 助手发送消息
2. 在 OpenClaw 日志中应能看到：
   ```
   [Buz] Received message from user:12345: "你好"
   [OpenClaw] Processing message...
   ```

#### 从 OpenClaw 发送消息到 IM

在 OpenClaw 交互界面中：

```
> /send buz:user:12345 你好，这是一条测试消息
```

或在配置中设置 `defaultTo` 自动回复。

---

## 7️⃣ 常见问题排查

### 问题 1：扩展未被识别

**症状**: `openclaw extensions list` 看不到 buz

**解决**:
```bash
# 1. 检查符号链接是否正确
ls -la /path/to/openclaw/extensions/buz

# 2. 检查 package.json 是否存在
cat /path/to/openclaw/extensions/buz/package.json

# 3. 重启 OpenClaw
openclaw restart
```

### 问题 2：依赖安装失败

**症状**: `npm install` 报错

**解决**:
```bash
# 清理并重装
rm -rf node_modules package-lock.json
npm install

# 或检查 Node 版本
node --version  # 需要 18+
```

### 问题 3：连接失败

**症状**: `[Buz gRPC] Error: 14 UNAVAILABLE`

**解决**:
1. 检查服务端是否运行：
   ```bash
   grpcurl buz-dc-ai.example.com:443 list
   ```

2. 检查网络连通性：
   ```bash
   telnet buz-dc-ai.example.com 443
   ```

3. 检查密钥是否正确：
   ```bash
   # 密钥应以 buz_sk_ 开头
   echo $BUZ_SECRET_KEY
   ```

### 问题 4：鉴权失败

**症状**: `Auth response: failed: invalid secret key`

**解决**:
```yaml
# 检查 config.yaml 中的密钥格式
channels:
  buz:
    accounts:
      default:
        secretKey: "buz_sk_xxxxxx"  # 确保包含完整密钥
```

### 问题 5：消息发送成功但用户收不到

**症状**: OpenClaw 日志显示发送成功，但 IM 没收到

**解决**:
1. 检查用户 ID 格式：
   ```yaml
   # 正确格式
   allowFrom:
     - "user:12345"      # 带前缀
     - "12345"           # 纯数字也可以
   ```

2. 检查用户是否在白名单：
   ```bash
   # 临时设置为 open 模式测试
   dm:
     policy: "open"
   ```

---

## 8️⃣ 高级配置

### 多账号配置

```yaml
channels:
  buz:
    accounts:
      # 生产环境
      prod:
        serverUrl: "buz-dc-ai-prod.example.com:443"
        secretKey: "buz_sk_prod_xxx"
        name: "Production"
        allowFrom: ["user:prod_user_1"]
      
      # 测试环境
      test:
        serverUrl: "localhost:9091"
        secretKey: "buz_sk_test_xxx"
        name: "Test"
        dm:
          policy: "open"

agents:
  prod-bot:
    channels:
      buz:
        account: prod
  
  test-bot:
    channels:
      buz:
        account: test
```

### 使用不同 Agent 配置

```yaml
agents:
  # 中文助手
  chinese-assistant:
    name: "Buz 小助手"
    instructions: |
      你是一个友好的中文 AI 助手。
      通过 Buz IM 与用户交流。
    
    model: gpt-4o
    
    channels:
      buz:
        enabled: true
        account: default
  
  # 英文助手
  english-assistant:
    name: "Buz Assistant"
    instructions: |
      You are a helpful English AI assistant.
    
    model: gpt-4o
    
    channels:
      buz:
        enabled: true
        account: default
```

---

## 9️⃣ 更新扩展

当代码有更新时：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新安装依赖
cd /path/to/openclaw/extensions/buz
npm install

# 3. 重启 OpenClaw
openclaw restart
```

---

## 🔟 卸载扩展

```bash
# 1. 停止 OpenClaw
openclaw stop

# 2. 移除配置
code ~/.config/openclaw/config.yaml
# 删除 channels.buz 部分

# 3. 删除扩展
rm -rf /path/to/openclaw/extensions/buz

# 4. 重启 OpenClaw
openclaw start
```

---

## 📚 相关文档

- [README.md](README.md) - 扩展说明文档
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [集成指南](../.qoze/buz/buz-dc-ai-openclaw-integration-guide.md) - 详细技术文档

---

## 🆘 获取帮助

如果遇到问题：

1. 查看日志：`openclaw logs --follow`
2. 检查配置：`openclaw config validate`
3. 查看状态：`openclaw status`
4. 参考 [集成指南](../.qoze/buz/buz-dc-ai-openclaw-integration-guide.md)

