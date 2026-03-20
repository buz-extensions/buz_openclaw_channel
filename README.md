# Buz OpenClaw Channel

OpenClaw channel extension for Buz IM via gRPC bidirectional streaming.

## 🚀 一键安装

### 方式一：远程一键安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/buz-openclaw-channel/main/install.sh | bash
```

带参数自动配置：
```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/buz-openclaw-channel/main/install.sh | bash -s -- \
  --server-url "buz-dc-ai.example.com:443" \
  --secret-key "buz_sk_your_key"
```

### 方式二：本地安装

克隆仓库后运行安装脚本：

```bash
git clone https://github.com/yourusername/buz-openclaw-channel.git
cd buz-openclaw-channel
./install.sh
```

### 方式三：开发模式快速安装

```bash
git clone https://github.com/yourusername/buz-openclaw-channel.git
cd buz-openclaw-channel
./scripts/quick-install.sh
```

---

## 📋 手动安装（如果自动安装失败）

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/buz-openclaw-channel.git
cd buz-openclaw-channel
```

### 2. 链接到 OpenClaw

```bash
# macOS/Linux
ln -sf $(pwd) ~/.config/openclaw/extensions/buz

# 或 macOS 特定路径
ln -sf $(pwd) ~/Library/Application\ Support/openclaw/extensions/buz
```

### 3. 安装依赖

```bash
cd ~/.config/openclaw/extensions/buz
npm install
# 或使用 pnpm
pnpm install
```

### 4. 配置 OpenClaw

编辑 `~/.config/openclaw/config.yaml`：

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai.example.com:443"
        secretKey: "buz_sk_your_secret_key"
        name: "My Buz Account"
```

### 5. 启动

```bash
openclaw --channel buz
```

---

## ✨ 功能特性

- **双向 gRPC 流式通信**: 实时消息收发，支持持久连接
- **自动重连机制**: 断线后自动重连，指数退避策略
- **心跳保活**: 30秒间隔心跳，保持连接稳定
- **多账号支持**: 可同时配置多个 Buz IM 账号
- **单聊/群聊**: 支持私聊和群组消息
- **用户白名单**: 可限制允许与 AI 对话的用户
- **Header 鉴权**: 安全的 Bearer Token 鉴权方式

---

## 📁 项目结构

```
buz-openclaw-channel/
├── install.sh              # 主安装脚本 ⭐
├── README.md               # 本文件
├── package.json            # NPM 配置
├── openclaw.plugin.json    # OpenClaw 插件清单
├── index.ts                # 插件入口
├── src/
│   ├── channel.ts          # Channel 插件核心实现
│   ├── grpc-client.ts      # gRPC 客户端封装
│   ├── accounts.ts         # 账户管理
│   ├── types.ts            # TypeScript 类型定义
│   ├── config-schema.ts    # 配置校验 Schema
│   ├── runtime.ts          # Runtime 状态管理
│   └── proto/
│       └── buz.proto       # Protocol Buffer 定义
└── scripts/
    ├── quick-install.sh    # 本地快速安装
    └── remote-install.sh   # 远程安装辅助脚本
```

---

## ⚙️ 配置选项

### 基础配置

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        enabled: true
        serverUrl: "buz-dc-ai.example.com:443"  # gRPC 服务器地址
        secretKey: "buz_sk_xxxx"                 # 接入密钥
        name: "My Buz Account"                   # 显示名称
```

### 高级配置

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai.example.com:443"
        secretKey: "buz_sk_xxxx"
        name: "Production"
        
        # 用户白名单（可选）
        allowFrom:
          - "user:12345"
          - "user:67890"
        
        # 私信安全策略
        dm:
          policy: "allowlist"  # allowlist | blocklist | open
          allowFrom:
            - "user:12345"
        
        # 群组策略
        groupPolicy: "open"  # allowlist | open
```

---

## 🛠️ 开发

### 本地开发安装

```bash
# 克隆项目
git clone https://github.com/yourusername/buz-openclaw-channel.git
cd buz-openclaw-channel

# 快速链接到 OpenClaw
./scripts/quick-install.sh

# 编辑代码后重启 OpenClaw 即可生效
```

### 构建

```bash
# 编译 TypeScript
npm run build

# 运行测试
npm test
```

---

## 🔧 故障排查

### 检查安装

```bash
./validate.sh
```

### 查看日志

```bash
# 前台运行查看日志
openclaw --channel buz --verbose

# 或设置调试环境变量
DEBUG=buz openclaw --channel buz
```

### 常见问题

**Q: 安装脚本提示 OpenClaw 未安装？**  
A: 请确保 OpenClaw CLI 在 PATH 中：`which openclaw`

**Q: 连接失败？**  
A: 检查 `serverUrl` 和防火墙设置，确认 gRPC 端口可访问

**Q: 鉴权失败？**  
A: 确认 `secretKey` 以 `buz_sk_` 开头且完整无误

---

## 📚 文档

- [GETTING_STARTED.md](GETTING_STARTED.md) - 5分钟快速上手
- [INSTALL.md](INSTALL.md) - 完整安装指南
- [CHEATSHEET.md](CHEATSHEET.md) - 命令速查卡
- [QUICKSTART.md](QUICKSTART.md) - 测试指南

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License
