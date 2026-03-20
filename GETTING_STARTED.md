# 🚀 5分钟快速上手 Buz Channel

适合已经安装 OpenClaw 的用户快速配置和运行。

---

## Step 1: 链接扩展 (30秒)

```bash
# 进入 OpenClaw extensions 目录
cd ~/.config/openclaw/extensions  # macOS: ~/Library/Application\ Support/openclaw/extensions

# 创建符号链接
ln -s /Users/zengshilin/work/openclaw/extensions/buz_openclaw_channel buz
```

---

## Step 2: 安装依赖 (1分钟)

```bash
cd buz
npm install
```

---

## Step 3: 添加配置 (2分钟)

编辑 OpenClaw 配置：

```bash
# macOS
code ~/Library/Application\ Support/openclaw/config.yaml

# Linux
code ~/.config/openclaw/config.yaml
```

添加以下内容：

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai-grpc-test.yfxn.lzpsap1.com:443"
        secretKey: "buz_sk_your_key_here"  # 联系管理员获取
        name: "My Buz"
```

---

## Step 4: 启动运行 (1分钟)

```bash
# 启动 OpenClaw
openclaw --channel buz

# 看到以下日志即成功：
# [Buz] Connecting to gRPC server...
# [Buz gRPC] Connected to buz-dc-ai-grpc-test.yfxn.lzpsap1.com:443
```

---

## Step 5: 测试 (30秒)

在 Buz IM 中发送消息给 AI 助手，OpenClaw 应能收到并回复。

---

## ✅ 验证清单

- [ ] 扩展已链接到 openclaw/extensions/buz
- [ ] `npm install` 成功完成
- [ ] config.yaml 添加了 channels.buz 配置
- [ ] 启动后日志显示 "Connected"
- [ ] IM 消息能到达 OpenClaw

遇到问题？查看 [INSTALL.md](INSTALL.md) 完整安装指南。
