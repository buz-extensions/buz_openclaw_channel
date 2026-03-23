import { recordInboundSessionAndDispatchReply } from "openclaw/plugin-sdk";
import { sendText } from "./outbound.js";
import { getBuzRuntime } from "../index.js";
import { resolve } from "path";
import { homedir } from "os";

function resolveDefaultAgentIdCompat(cfg: any): string {
  const configured = cfg?.defaultAgentId ?? cfg?.agents?.default ?? cfg?.agent?.default;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  const agents = Array.isArray(cfg?.agents) ? cfg.agents : undefined;
  const firstAgentId = agents?.find((entry: any) => typeof entry?.id === "string" && entry.id.trim())?.id;
  return firstAgentId || "default";
}

function resolveStorePath(cfg: any, agentId: string): string {
  const runtime = getBuzRuntime();
  const resolver = runtime?.channel?.session?.resolveStorePath;
  if (typeof resolver === "function") {
    return resolver(cfg?.session?.store, { agentId });
  }

  const configuredPath = cfg?.session?.storePath || ".openclaw/sessions";
  if (configuredPath.startsWith("/") || configuredPath.startsWith("~")) {
    return configuredPath.replace(/^~/, homedir());
  }
  return resolve(homedir(), configuredPath);
}

function buildSessionKey(params: {
  core: any;
  agentId: string;
  accountId: string;
  isGroup: boolean;
  conversationId: string;
}) {
  const { core, agentId, accountId, isGroup, conversationId } = params;
  const buildAgentSessionKey = core?.channel?.routing?.buildAgentSessionKey;
  if (typeof buildAgentSessionKey === "function") {
    return buildAgentSessionKey({
      agentId,
      channel: "buz",
      accountId,
      chatType: isGroup ? "group" : "direct",
      conversationId,
    });
  }
  return `agent:${agentId}:buz:${accountId}:${isGroup ? "group" : "direct"}:${conversationId}`;
}

async function emitIntermediate(params: {
  toTarget: string;
  accountId: string;
  messageSid: string;
  type: string;
  event: string;
  text?: string;
}) {
  const { toTarget, accountId, messageSid, type, event, text } = params;
  if (!text && type !== "assistant_message_start" && !(type === "reasoning" && event === "done")) {
    return;
  }
  await sendText({
    to: toTarget,
    text: text || "",
    accountId,
    replyToId: messageSid,
    type,
    event,
  });
}

export async function handleInboundMessage(ctx: any, inboundMsg: any) {
  console.log("[buz inbound] =========================================");
  console.log("[buz inbound] handleInboundMessage called");
  console.log("[buz inbound] inboundMsg keys:", Object.keys(inboundMsg || {}));
  console.log("[buz inbound] inboundMsg:", JSON.stringify(inboundMsg, null, 2));

  const accountId = ctx.account.accountId;
  const cfg = ctx.cfg;
  const core = getBuzRuntime();
  const agentId = resolveDefaultAgentIdCompat(cfg);

  console.log("[buz inbound] accountId:", accountId);
  console.log("[buz inbound] agentId:", agentId);

  const isGroup = inboundMsg.chat_type === "group";
  const senderId = String(inboundMsg.sender_id || "").trim();
  const senderName = String(inboundMsg.sender_name || inboundMsg.sender_id || "").trim() || undefined;
  const conversationId = String(isGroup ? inboundMsg.group_id : inboundMsg.sender_id || "").trim();
  const rawBody = String(inboundMsg.content_text || "");
  const messageSid = String(inboundMsg.message_id || Date.now().toString());

  const fromTarget = isGroup ? `buz:group:${conversationId}:${senderId}` : `buz:${senderId}`;
  const toTarget = isGroup ? `buz:group:${conversationId}` : `buz:${senderId}`;
  const sessionKey = buildSessionKey({
    core,
    agentId,
    accountId,
    isGroup,
    conversationId,
  });

  console.log("[buz inbound] fromTarget:", fromTarget);
  console.log("[buz inbound] toTarget:", toTarget);
  console.log("[buz inbound] conversationId:", conversationId);
  console.log("[buz inbound] sessionKey:", sessionKey);

  const finalizeInboundContext = core?.channel?.reply?.finalizeInboundContext;
  const baseCtxPayload = {
    MessageSid: messageSid,
    MessageSids: [messageSid],
    SessionKey: sessionKey,
    ConversationId: conversationId,
    From: fromTarget,
    To: toTarget,
    Body: rawBody,
    BodyForAgent: rawBody,
    BodyForCommands: rawBody,
    Channel: "buz",
    Provider: "buz",
    Surface: "buz",
    OriginatingChannel: "buz",
    OriginatingTo: toTarget,
    AccountId: accountId,
    ChatType: isGroup ? "group" : "direct",
    SenderName: senderName,
    SenderId: senderId || undefined,
  };
  const ctxPayload =
    typeof finalizeInboundContext === "function"
      ? finalizeInboundContext(baseCtxPayload)
      : baseCtxPayload;

  console.log("[buz inbound] ctxPayload:", JSON.stringify(ctxPayload, null, 2));

  const storePath = resolveStorePath(cfg, agentId);
  console.log("[buz inbound] storePath:", storePath);
  console.log("[buz inbound] dispatching via recordInboundSessionAndDispatchReply...");

  let streamEventQueue = Promise.resolve();
  let lastPartialText = "";
  let lastReasoningText = "";
  const enqueueStreamEvent = (task: () => Promise<void>) => {
    const next = streamEventQueue.then(task);
    streamEventQueue = next.catch((err) => {
      console.error("[buz inbound] stream event failed:", err);
    });
    return next;
  };

  try {
    await core.channel.session.updateLastRoute({
      storePath,
      sessionKey: ctxPayload.SessionKey ?? sessionKey,
      deliveryContext: {
        channel: "buz",
        to: isGroup ? `group:${conversationId}` : `user:${senderId}`,
        accountId,
      },
      ctx: ctxPayload,
    });

    await recordInboundSessionAndDispatchReply({
      cfg,
      channel: "buz",
      accountId,
      agentId,
      routeSessionKey: sessionKey,
      storePath,
      ctxPayload,
      recordInboundSession: core.channel.session.recordInboundSession,
      dispatchReplyWithBufferedBlockDispatcher: core.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
      deliver: async (payload: any) => {
        await enqueueStreamEvent(async () => {
          console.log("[buz inbound] deliver called text:", payload?.text?.substring?.(0, 50));
          if (!payload?.text) {
            return;
          }
          await sendText({
            to: toTarget,
            text: payload.text,
            accountId,
            replyToId: messageSid,
            type: payload?.isReasoning ? "reasoning" : "final_reply",
            event: "done",
          });
          console.log("[buz inbound] reply sent successfully via gRPC");
        });
      },
      onRecordError: (err: any) => {
        console.error("[buz inbound] failed to record session:", err);
      },
      onDispatchError: (err: any, info: any) => {
        console.error(`[buz inbound] ${info?.kind || "unknown"} reply failed:`, err);
      },
      replyOptions: {
        disableBlockStreaming: false,
        onPartialReply: async (payload: any) => {
          const text = String(payload?.text || "");
          if (!text || text === lastPartialText) {
            return;
          }
          lastPartialText = text;
          await enqueueStreamEvent(async () => {
            await emitIntermediate({
              toTarget,
              accountId,
              messageSid,
              type: "partial_reply",
              event: "delta",
              text,
            });
          });
        },
        onReasoningStream: async (payload: any) => {
          const text = String(payload?.text || "");
          if (!text || text === lastReasoningText) {
            return;
          }
          lastReasoningText = text;
          await enqueueStreamEvent(async () => {
            await emitIntermediate({
              toTarget,
              accountId,
              messageSid,
              type: "reasoning",
              event: "delta",
              text,
            });
          });
        },
        onAssistantMessageStart: async () => {
          await enqueueStreamEvent(async () => {
            lastPartialText = "";
            await emitIntermediate({
              toTarget,
              accountId,
              messageSid,
              type: "assistant_message_start",
              event: "start",
              text: "",
            });
          });
        },
        onReasoningEnd: async () => {
          await enqueueStreamEvent(async () => {
            lastReasoningText = "";
            await emitIntermediate({
              toTarget,
              accountId,
              messageSid,
              type: "reasoning",
              event: "done",
              text: "",
            });
          });
        },
        onToolStart: async (payload: any) => {
          const toolName = String(payload?.name || "tool").trim() || "tool";
          const phase = String(payload?.phase || "start").trim() || "start";
          await enqueueStreamEvent(async () => {
            await emitIntermediate({
              toTarget,
              accountId,
              messageSid,
              type: "tool_start",
              event: "start",
              text: `${toolName}${phase ? ` (${phase})` : ""}`,
            });
          });
        },
      },
    });

    await streamEventQueue;
    console.log("[buz inbound] message dispatched successfully");
    ctx.log?.info?.(
      `[${accountId}] Successfully dispatched inbound message from ${inboundMsg.sender_id}`,
    );
  } catch (err: any) {
    console.error("[buz inbound] failed to dispatch:", err.message);
    ctx.log?.error?.(`[${accountId}] Failed to dispatch inbound message: ${err.message}`);
    throw err;
  }
  console.log("[buz inbound] =========================================");
}
