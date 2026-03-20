# 🔌 Buz OpenClaw Channel

> 一条命令将 Buz IM 接入 OpenClaw AI 助手

## 🚀 快速安装

### 一键安装

```bash
curl -fsSL https://buz.ai/openclaw/install.sh | bash
```

或带参数自动配置：

```bash
curl -fsSL https://buz.ai/openclaw/install.sh | bash -s -- \
  --server-url "your-server.com:443" \
  --secret-key "buz_sk_your_key"
```

### 安装后启动

```bash
openclaw --channel buz
```

---

## 📋 前提条件

- [OpenClaw](https://docs.openclaw.ai/install) 已安装
- Node.js 18+
- Buz IM 接入密钥

---

## 🛠️ 手动安装

如果一键安装失败：

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/buz-openclaw-channel.git

# 2. 运行安装脚本
cd buz-openclaw-channel
./install.sh

# 3. 按提示配置并启动
```

---

## ⚙️ 配置

安装完成后，编辑 `~/.config/openclaw/config.yaml`：

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai.example.com:443"
        secretKey: "buz_sk_your_key"
        name: "My Buz"
```

---

## ✨ 功能

- 💬 双向实时消息
- 🔄 自动断线重连
- 👥 单聊/群聊支持
- 🔐 安全鉴权
- 📊 多账号管理

---

## 📖 文档

- [完整安装指南](INSTALL.md)
- [快速开始](GETTING_STARTED.md)
- [命令速查](CHEATSHEET.md)

---

## 🐛 故障排查

```bash
# 验证安装
~/.config/openclaw/extensions/buz/validate.sh

# 查看日志
openclaw --channel buz --verbose
```

---

Made with ❤️ by Buz AI Team
