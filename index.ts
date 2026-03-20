import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk/line";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/line";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/line";
import { z } from "zod";

const BuzAccountSchema = z
  .object({
    enabled: z.boolean().optional(),
    serverAddress: z.string().optional(),
    secretKey: z.string().optional(),
  })
  .partial();

const BuzConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    serverAddress: z.string().optional(),
    secretKey: z.string().optional(),
    accounts: z.record(z.string(), BuzAccountSchema.optional()).optional(),
  })
  .partial();

export const buzChannelPlugin = {
  id: "buz",
  meta: {
    id: "buz",
    label: "buz",
    selectionLabel: "buz (gRPC)",
    docsPath: "/channels/buz",
    blurb: "Connect OpenClaw to buz via gRPC bidirectional stream.",
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reactions: false,
    threads: true,
    media: false,
  },
  configSchema: buildChannelConfigSchema(BuzConfigSchema),
  config: {
    listAccountIds: (cfg: any) => {
      const accounts = cfg?.channels?.["buz"]?.accounts || {};
      const ids = Object.keys(accounts);
      return ids.length > 0 ? ids : ["default"];
    },
    resolveAccount: (cfg: any, accountId?: string | null) => {
      const id = accountId || "default";
      const channelConfig = cfg?.channels?.["buz"] ?? {};

      const topLevelDefault =
        id === "default"
          ? {
              enabled: channelConfig.enabled,
              serverAddress: channelConfig.serverAddress,
              secretKey: channelConfig.secretKey,
            }
          : undefined;

      const accountConfig = channelConfig?.accounts?.[id] ?? topLevelDefault ?? {};
      const configured = Boolean(accountConfig.serverAddress && accountConfig.secretKey);

      return {
        accountId: id,
        name: `buz (${id})`,
        enabled: accountConfig.enabled !== false,
        serverAddress: accountConfig.serverAddress,
        secretKey: accountConfig.secretKey,
        configured,
        config: accountConfig,
      };
    },
    isConfigured: (account: any) => Boolean(account.configured),
    describeAccount: (account: any) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.configured),
    }),
  },
  messaging: {
    normalizeTarget: (target: string) => target,
    targetResolver: {
      looksLikeId: (_id: string) => true,
      hint: "<targetId>",
    },
    resolveSessionTarget: ({ id }: any) => id,
  },
  setupWizard: {
    steps: [
      {
        id: "serverAddress",
        type: "text",
        label: "Server Address",
        placeholder: "e.g. grpc.buz.ai:443",
      },
      {
        id: "secretKey",
        type: "password",
        label: "Secret Key",
        placeholder: "Enter your IM Secret Key",
      },
    ],
  },
  setup: {
    validateInput: async (params: any) => {
      const { setupAdapter } = await import("./src/setup.js");
      return setupAdapter.validateInput(params);
    },
    applyAccountConfig: async (params: any) => {
      const { setupAdapter } = await import("./src/setup.js");
      const result = await setupAdapter.applyAccountConfig(params);
      return result;
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: null,
    textChunkLimit: 4000,
    sendText: async ({ to, text, accountId, replyToId, threadId, cfg }: any) => {
      const { sendText } = await import("./src/outbound.js");
      return await sendText({ to, text, accountId, replyToId, threadId, cfg });
    },
    sendMedia: async ({ to }: any) => {
      return { messageId: "media-unsupported", chatId: to };
    },
  },
  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      connected: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
      lastInboundAt: null,
      lastOutboundAt: null,
    },
    buildChannelSummary: ({ snapshot }: any) => {
      if (!snapshot?.configured)
        return { text: "Not configured", kind: "muted", configured: false };
      if (snapshot?.connected) return { text: "Connected", kind: "healthy", configured: true };
      if (snapshot?.running) return { text: "Starting", kind: "warning", configured: true };
      return { text: "Configured", kind: "warning", configured: true };
    },
    buildAccountSnapshot: ({ account, runtime }: any) => {
      return {
        accountId: account.accountId,
        name: account.name,
        enabled: account.enabled,
        configured: Boolean(account.configured),
        running: runtime?.running ?? false,
        connected: runtime?.connected ?? false,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        mode: "grpc",
        ...(runtime?.lastError ? { lastError: runtime.lastError } : {}),
        ...(runtime?.lastInboundAt ? { lastInboundAt: runtime.lastInboundAt } : {}),
        ...(runtime?.lastOutboundAt ? { lastOutboundAt: runtime.lastOutboundAt } : {}),
      };
    },
  },
  gateway: {
    startAccount: async (ctx: any) => {
      const account = ctx.account;
      const serverAddress = account.serverAddress;
      const secretKey = account.secretKey;

      if (!serverAddress || !secretKey) {
        throw new Error("Missing serverAddress or secretKey for buz");
      }

      ctx.log?.info(`[${account.accountId}] starting buz gRPC provider to ${serverAddress}`);

      const { startGateway } = await import("./src/gateway.js");
      const result = await startGateway(ctx, serverAddress, secretKey);
      return result;
    },
    stopAccount: async (ctx: any) => {
      const { stopGateway } = await import("./src/gateway.js");
      return stopGateway(ctx);
    },
  },
} as any;

export const setBuzRuntime = (_runtime: any) => {
  // buz doesn't need special runtime setup yet
};

const plugin = {
  id: "buz",
  name: "buz Plugin",
  description: "Connects OpenClaw to buz",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setBuzRuntime(api.runtime);
    api.registerChannel({ plugin: buzChannelPlugin as ChannelPlugin });
  },
};

export default plugin;
