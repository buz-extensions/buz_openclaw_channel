# Buz Channel 快速开始指南

## 1. 安装依赖

```bash
cd extensions/buz_openclaw_channel
npm install
# 或使用 pnpm
pnpm install
```

## 2. 配置 OpenClaw

编辑 OpenClaw 配置文件（通常位于 `~/.config/openclaw/config.yaml`）：

```yaml
channels:
  buz:
    enabled: true
    accounts:
      default:
        serverUrl: "buz-dc-ai.example.com:443"
        secretKey: "buz_sk_your_secret_key"
        name: "Production Buz"
        # 可选：限制哪些用户可以与 AI 对话
        allowFrom:
          - "user:12345"
          - "user:67890"
```

## 3. 使用 OpenClaw CLI 添加 Channel

```bash
# 启动配置向导
openclaw channels add buz

# 或者直接启动
openclaw --channel buz
```

## 4. 测试连接

### 服务端 (Java)
确保 buz-dc-ai 服务已启动：

```bash
cd buz-dc-ai
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Dmetadata.region=cn -Dmetadata.business.env=buz -Dmetadata.deploy.env=test"
```

### 客户端 (OpenClaw)
启动 OpenClaw 后，查看日志确认连接成功：

```
[Buz] Connected to buz-dc-ai.example.com:443
```

## 5. 消息格式

### 入站消息 (IM → OpenClaw)

```json
{
  "messageId": "msg_123",
  "senderId": "user_456",
  "senderName": "张三",
  "chatType": "direct",
  "contentText": "你好，AI！"
}
```

### 出站消息 (OpenClaw → IM)

```json
{
  "replyToId": "msg_123",
  "targetId": "user_456",
  "chatType": "direct",
  "contentText": "你好！我是 AI 助手。"
}
```

## 6. 多环境配置

```yaml
channels:
  buz:
    accounts:
      # 生产环境
      prod:
        serverUrl: "buz-dc-ai-prod.example.com:443"
        secretKey: "buz_sk_prod_key"
      
      # 测试环境
      test:
        serverUrl: "localhost:9091"
        secretKey: "buz_sk_test_key"
        dm:
          policy: "open"  # 测试环境开放所有私信
```

## 7. 故障排查

### 连接失败

检查服务端日志：
```bash
tail -f buz-dc-ai/logs/application.log
```

检查 OpenClaw 日志：
```bash
openclaw --channel buz --verbose
```

### 常见问题

1. **鉴权失败**: 确认 `secretKey` 格式正确 (以 `buz_sk_` 开头)
2. **连接超时**: 检查防火墙和端口开放情况
3. **消息未送达**: 确认用户在白名单 (`allowFrom`) 中

## 8. 扩展开发

### 添加新消息类型

1. 修改 `src/proto/buz.proto` 添加新消息类型
2. 重新生成代码（如有需要）
3. 在 `src/channel.ts` 中处理新消息类型
4. 更新 `src/grpc-client.ts` 添加发送方法

### 调试模式

```typescript
// 在 src/grpc-client.ts 中启用详细日志
const client = new BuzGrpcClient({
  // ...options,
  debug: true,
});
```
