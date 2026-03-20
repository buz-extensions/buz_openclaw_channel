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

function resolveStorePath(cfg: any): string {
  const configuredPath = cfg?.session?.storePath || ".openclaw/sessions";
  if (configuredPath.startsWith("/") || configuredPath.startsWith("~")) {
    return configuredPath.replace(/^~/, homedir());
  }
  return resolve(homedir(), configuredPath);
}

export async function handleInboundMessage(ctx: any, inboundMsg: any) {
  console.log("[buz inbound] =========================================");
  console.log("[buz inbound] handleInboundMessage called");
  console.log("[buz inbound] inboundMsg keys:", Object.keys(inboundMsg || {}));
  console.log("[buz inbound] inboundMsg:", JSON.stringify(inboundMsg, null, 2));

  const accountId = ctx.account.accountId;
  const cfg = ctx.cfg;
  const agentId = resolveDefaultAgentIdCompat(cfg);

  console.log("[buz inbound] accountId:", accountId);
  console.log("[buz inbound] agentId:", agentId);

  const fromTarget =
    inboundMsg.chat_type === "group"
      ? `buz:group:${inboundMsg.group_id}:${inboundMsg.sender_id}`
      : `buz:${inboundMsg.sender_id}`;

  const toTarget =
    inboundMsg.chat_type === "group"
      ? `buz:group:${inboundMsg.group_id}`
      : `buz:${inboundMsg.sender_id}`;

  const conversationId =
    inboundMsg.chat_type === "group" ? inboundMsg.group_id : inboundMsg.sender_id;

  console.log("[buz inbound] fromTarget:", fromTarget);
  console.log("[buz inbound] toTarget:", toTarget);
  console.log("[buz inbound] conversationId:", conversationId);

  const ctxPayload = {
    MessageSid: inboundMsg.message_id || Date.now().toString(),
    MessageSids: [inboundMsg.message_id || Date.now().toString()],
    SessionKey: `buz:${accountId}:${conversationId}`,
    ConversationId: conversationId,
    From: fromTarget,
    To: toTarget,
    Body: inboundMsg.content_text || "",
    BodyForAgent: inboundMsg.content_text || "",
    BodyForCommands: inboundMsg.content_text || "",
    Channel: "buz",
    SenderName: inboundMsg.sender_name || inboundMsg.sender_id,
  };

  console.log("[buz inbound] ctxPayload:", JSON.stringify(ctxPayload, null, 2));

  const storePath = resolveStorePath(cfg);
  console.log("[buz inbound] storePath:", storePath);
  console.log("[buz inbound] sessionKey:", ctxPayload.SessionKey);

  try {
    console.log("[buz inbound] dispatching via recordInboundSessionAndDispatchReply...");
    
    // Get core from runtime
    const core = getBuzRuntime().core;
    
    await recordInboundSessionAndDispatchReply({
      recordInboundSession: core.channel.session.recordInboundSession,
      dispatchReplyWithBufferedBlockDispatcher: core.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
      storePath,
      ctxPayload,
      agentId,
      channel: "buz",
      accountId,
      deliver: async (payload: any, info: any) => {
        console.log(
          "[buz inbound] deliver called:",
          info?.kind,
          "text:",
          payload?.text?.substring?.(0, 50),
        );
        if (!payload?.text) {
          return;
        }
        await sendText({
          to: toTarget,
          text: payload.text,
          accountId,
          replyToId: inboundMsg.message_id,
        });
        console.log("[buz inbound] reply sent successfully via gRPC");
      },
      onRecordError: (err: any) => {
        console.error("[buz inbound] failed to record session:", err);
      },
      onDispatchError: (err: any, info: any) => {
        console.error(`[buz inbound] ${info?.kind || "unknown"} reply failed:`, err);
      },
      replyOptions: {
        disableBlockStreaming: true,
      },
    });
    
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
