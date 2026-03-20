# Buz Channel 快速参考

## 常用命令

```bash
# 安装依赖
cd buz && npm install

# 启动（前台）
openclaw --channel buz

# 启动（带调试日志）
DEBUG=buz openclaw --channel buz

# 查看状态
openclaw status

# 验证配置
openclaw config validate

# 查看日志
openclaw logs --follow
```

## 配置文件路径

| 系统 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/openclaw/config.yaml` |
| Linux | `~/.config/openclaw/config.yaml` |
| Windows | `%APPDATA%\openclaw\config.yaml` |

## 最小配置示例

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai.example.com:443"
        secretKey: "buz_sk_xxx"
```

## 消息格式

### 入站 (IM → OpenClaw)
```json
{
  "messageId": "msg_123",
  "senderId": "user_456",
  "senderName": "张三",
  "chatType": "direct",  // or "group"
  "groupId": "grp_789",  // 群聊时
  "contentText": "你好"
}
```

### 出站 (OpenClaw → IM)
```json
{
  "replyToId": "msg_123",
  "targetId": "user_456",
  "chatType": "direct",
  "contentText": "你好！"
}
```

## 故障排查

| 问题 | 解决 |
|------|------|
| 扩展未识别 | `ls -la ~/.config/openclaw/extensions/buz` |
| 连接失败 | 检查 `serverUrl` 和防火墙 |
| 鉴权失败 | 确认 `secretKey` 以 `buz_sk_` 开头 |
| 消息未送达 | 检查 `allowFrom` 白名单 |

## gRPC 测试

```bash
# 使用 grpcurl 测试服务端
grpcurl \
  -H "authorization: Bearer buz_sk_xxx" \
  -H "x-openclaw-id: test" \
  buz-dc-ai.example.com:443 \
  buz.dc.ai.bridge.OpenClawBridgeService/ConnectStream
```

## 文件位置

```
extensions/buz_openclaw_channel/
├── index.ts           # 入口
├── src/channel.ts     # 核心逻辑
├── src/grpc-client.ts # gRPC 客户端
├── src/proto/buz.proto # 协议定义
└── package.json       # 配置
```
