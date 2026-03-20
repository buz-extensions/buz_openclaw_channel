import { formatAllowFromLowercase } from "openclaw/plugin-sdk/allow-from";
import { createScopedChannelConfigAdapter } from "openclaw/plugin-sdk/channel-config-helpers";
import {
  createChannelDirectoryAdapter,
  createPairingPrefixStripper,
  createTextPairingAdapter,
  getChatChannelMeta,
  normalizeMessageChannel,
  PAIRING_APPROVED_MESSAGE,
} from "openclaw/plugin-sdk/channel-runtime";
import type {
  ChannelPlugin,
  ClawdbotConfig,
} from "openclaw/plugin-sdk/channel-runtime";
import { buildOutboundBaseSessionKey } from "openclaw/plugin-sdk/core";
import { resolveThreadSessionKeys, type RoutePeer } from "openclaw/plugin-sdk/routing";
import {
  listBuzAccountIds,
  resolveBuzAccount,
  resolveDefaultBuzAccountId,
} from "./accounts.js";
import { BuzGrpcClient } from "./grpc-client.js";
import {
  getBuzRuntime,
  removeBuzRuntime,
  setBuzRuntime,
  setBuzRuntimeState,
} from "./runtime.js";
import type { BuzConfig, BuzInboundMessage, ResolvedBuzAccount } from "./types.js";

const BUZZ_CHANNEL = "buz" as const;

const meta = getChatChannelMeta(BUZZ_CHANNEL);

// 配置适配器
const buzConfigAdapter = createScopedChannelConfigAdapter<ResolvedBuzAccount>({
  sectionKey: BUZZ_CHANNEL,
  listAccountIds: listBuzAccountIds,
  resolveAccount: (cfg, accountId) => resolveBuzAccount({ cfg, accountId }),
  defaultAccountId: resolveDefaultBuzAccountId,
  clearBaseFields: ["secretKey"],
  resolveAllowFrom: (account) => account.config.allowFrom,
  formatAllowFrom: (allowFrom) => formatAllowFromLowercase({ allowFrom }),
});

// 构建基础 session key
function buildBuzBaseSessionKey(params: {
  cfg: ClawdbotConfig;
  agentId: string;
  accountId?: string | null;
  peer: RoutePeer;
}) {
  return buildOutboundBaseSessionKey({ ...params, channel: BUZZ_CHANNEL });
}

// 解析出站会话路由
function resolveBuzOutboundSessionRoute(params: {
  cfg: ClawdbotConfig;
  agentId: string;
  accountId?: string | null;
  target: string;
  replyToId?: string | null;
  threadId?: string | number | null;
}) {
  const targetId = params.target.replace(/^buz:/i, "").trim();
  if (!targetId) {
    return null;
  }

  // 判断聊天类型
  const isGroup = targetId.startsWith("group:") || targetId.includes("@group");
  const cleanTargetId = targetId.replace(/^group:/, "").replace(/@group$/, "");

  const peer: RoutePeer = {
    kind: isGroup ? "channel" : "direct",
    id: cleanTargetId,
  };

  const baseSessionKey = buildBuzBaseSessionKey({
    cfg: params.cfg,
    agentId: params.agentId,
    accountId: params.accountId,
    peer,
  });

  const threadKeys = resolveThreadSessionKeys({
    baseSessionKey,
    threadId: params.threadId?.toString() ?? null,
    useSuffix: false,
  });

  return {
    sessionKey: threadKeys.sessionKey,
    baseSessionKey,
    peer,
    chatType: isGroup ? ("group" as const) : ("direct" as const),
    from: `buz:${cleanTargetId}`,
    to: isGroup ? `group:${cleanTargetId}` : `user:${cleanTargetId}`,
  };
}

// 处理入站消息
function handleInboundMessage(
  message: BuzInboundMessage,
  accountId: string,
  runtimeApi: any
) {
  const sessionKey = buildBuzBaseSessionKey({
    cfg: runtimeApi.cfg,
    agentId: runtimeApi.agentId,
    accountId,
    peer: {
      kind: message.chatType === "group" ? "channel" : "direct",
      id: message.chatType === "group" ? message.groupId || message.senderId : message.senderId,
    },
  });

  // 构建标准化的入站消息
  const inboundPayload = {
    messageId: message.messageId,
    channel: BUZZ_CHANNEL,
    accountId,
    sender: {
      id: message.senderId,
      name: message.senderName,
    },
    content: {
      text: message.contentText,
    },
    sessionKey,
    chatType: message.chatType,
    groupId: message.groupId,
    timestamp: Date.now(),
  };

  // 发送到 OpenClaw 的消息管道
  runtimeApi.receiveMessage(inboundPayload);
}

export const buzPlugin: ChannelPlugin<ResolvedBuzAccount> = {
  id: BUZZ_CHANNEL,
  meta,

  capabilities: {
    chatTypes: ["direct", "group"],
    polls: false,
    reactions: false,
    threads: false,
    media: true,
    nativeCommands: false,
  },

  streaming: {
    blockStreamingCoalesceDefaults: { minChars: 500, idleMs: 1000 },
  },

  reload: {
    configPrefixes: ["channels.buz"],
  },

  configSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      enabled: { type: "boolean" },
      serverUrl: { type: "string" },
      secretKey: { type: "string" },
      accountId: { type: "string" },
      name: { type: "string" },
      allowFrom: { type: "array", items: { type: "string" } },
      defaultTo: { type: "string" },
      dm: {
        type: "object",
        properties: {
          policy: { type: "string", enum: ["allowlist", "blocklist", "open"] },
          allowFrom: { type: "array", items: { type: "string" } },
        },
      },
      groupPolicy: { type: "string", enum: ["allowlist", "open"] },
    },
  },

  config: {
    ...buzConfigAdapter,
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
      serverUrl: account.serverUrl,
    }),
  },

  setup: async ({ cfg, accountId, runtimeApi }) => {
    const account = resolveBuzAccount({ cfg, accountId });
    
    if (!account.configured) {
      throw new Error(`Buz account ${accountId} is not configured`);
    }

    // 检查是否已存在连接
    const existingClient = getBuzRuntime(accountId);
    if (existingClient) {
      console.log(`[Buz] Account ${accountId} already has an active connection`);
      return;
    }

    const client = new BuzGrpcClient({
      serverUrl: account.serverUrl!,
      secretKey: account.secretKey!,
      openclawId: runtimeApi.instanceId || "openclaw-instance-1",
      onMessage: (msg) => handleInboundMessage(msg, accountId, runtimeApi),
      onConnect: () => {
        console.log(`[Buz] Connected to ${account.serverUrl}`);
        setBuzRuntimeState(accountId, {
          accountId,
          running: true,
          connected: true,
          reconnectAttempts: 0,
          lastConnectedAt: new Date(),
          lastDisconnect: null,
          lastEventAt: new Date(),
          lastError: null,
        });
      },
      onDisconnect: () => {
        console.log(`[Buz] Disconnected from ${account.serverUrl}`);
      },
      onError: (error) => {
        console.error(`[Buz] Connection error:`, error);
        setBuzRuntimeState(accountId, {
          accountId,
          running: true,
          connected: false,
          reconnectAttempts: 0,
          lastConnectedAt: null,
          lastDisconnect: new Date(),
          lastEventAt: null,
          lastError: error.message,
        });
      },
    });

    client.connect();
    setBuzRuntime(accountId, client);

    // 启动心跳
    const heartbeatInterval = setInterval(() => {
      client.sendHeartbeat();
    }, 30000);

    // 保存 interval 以便清理
    (client as any)._heartbeatInterval = heartbeatInterval;
  },

  teardown: async ({ accountId }) => {
    const client = getBuzRuntime(accountId);
    if (client) {
      // 清理心跳
      if (client._heartbeatInterval) {
        clearInterval(client._heartbeatInterval);
      }
      client.disconnect();
      removeBuzRuntime(accountId);
    }
  },

  pairing: createTextPairingAdapter({
    idLabel: "buzUserId",
    message: PAIRING_APPROVED_MESSAGE,
    normalizeAllowEntry: createPairingPrefixStripper(/^buz:/i),
    notify: async ({ id, message, runtimeApi }) => {
      // 通过 gRPC 发送配对消息
      const accountId = runtimeApi?.accountId || resolveDefaultBuzAccountId(runtimeApi.cfg);
      const client = getBuzRuntime(accountId);
      if (client) {
        client.sendMessage({
          targetId: id,
          chatType: "direct",
          contentText: message,
        });
      }
    },
  }),

  allowlist: {
    ...buzConfigAdapter,
    normalizeEntry: ({ entry }) => entry.replace(/^buz:/i, "").trim(),
  },

  security: {
    resolveDmPolicy: (account) =>
      account.config.dm?.policy === "allowlist"
        ? { kind: "allowlist" as const, allowFrom: account.config.dm.allowFrom }
        : account.config.dm?.policy === "blocklist"
        ? { kind: "blocklist" as const }
        : { kind: "open" as const },
  },

  messaging: {
    normalizeTarget: ({ to }) => {
      const normalized = to.replace(/^buz:/i, "").trim();
      return normalized ? { to: `buz:${normalized}` } : null;
    },
    resolveSessionTarget: ({ id }) => ({ to: `buz:${id}` }),
    parseExplicitTarget: ({ raw }) => {
      const target = raw.replace(/^buz:/i, "").trim();
      if (!target) return null;
      const isGroup = target.startsWith("group:");
      return {
        to: `buz:${target}`,
        chatType: isGroup ? ("group" as const) : ("direct" as const),
      };
    },
    inferTargetChatType: ({ to }) => {
      const normalized = to.replace(/^buz:/i, "");
      return normalized.startsWith("group:") ? "group" : "direct";
    },
    resolveOutboundSessionRoute: resolveBuzOutboundSessionRoute,
  },

  outbound: {
    deliveryMode: "direct",
    chunker: null,
    textChunkLimit: 4000,
    resolveTarget: ({ to }) => to.replace(/^buz:/i, "").trim(),
    sendText: async ({ to, text, accountId, replyToId }) => {
      const client = getBuzRuntime(accountId || "default");
      if (!client) {
        throw new Error("Buz client not connected");
      }

      const targetId = to.replace(/^buz:/i, "").trim();
      const isGroup = targetId.startsWith("group:");

      const success = client.sendMessage({
        replyToId: replyToId || undefined,
        targetId: targetId.replace(/^group:/, ""),
        chatType: isGroup ? "group" : "direct",
        contentText: text,
      });

      if (!success) {
        throw new Error("Failed to send message");
      }

      return { messageId: `buz-${Date.now()}` };
    },
  },

  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      connected: false,
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastDisconnect: null,
      lastEventAt: null,
      lastError: null,
    },
    probeAccount: async ({ account }) => {
      if (!account.serverUrl) {
        return { ok: false, error: "Server URL not configured" };
      }
      if (!account.secretKey) {
        return { ok: false, error: "Secret key not configured" };
      }
      // TODO: 实现实际的连接探测
      return { ok: true };
    },
  },
};
