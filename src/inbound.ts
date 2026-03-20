import { resolveDefaultAgentId } from "openclaw/plugin-sdk/agent-runtime";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import { recordInboundSession } from "openclaw/plugin-sdk/channel-runtime";
import {
  dispatchInboundMessage,
  createReplyDispatcherWithTyping,
} from "openclaw/plugin-sdk/reply-runtime";
import { sendText } from "./outbound.js";

export async function handleInboundMessage(ctx: any, inboundMsg: any) {
  console.log("[buz inbound] =========================================");
  console.log("[buz inbound] handleInboundMessage called");
  console.log("[buz inbound] inboundMsg keys:", Object.keys(inboundMsg || {}));
  console.log("[buz inbound] inboundMsg:", JSON.stringify(inboundMsg, null, 2));

  const accountId = ctx.account.accountId;
  const cfg = ctx.cfg;
  const agentId = resolveDefaultAgentId(cfg);

  console.log("[buz inbound] accountId:", accountId);
  console.log("[buz inbound] agentId:", agentId);

  // Parse InboundMessage
  // string message_id
  // string sender_id
  // string sender_name
  // string chat_type // "direct" or "group"
  // string group_id
  // string content_text

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

  // Record inbound session for history tracking in UI
  const storePath = cfg?.session?.storePath || ".openclaw/sessions";
  console.log("[buz inbound] recording inbound session, storePath:", storePath);
  console.log("[buz inbound] sessionKey:", ctxPayload.SessionKey);

  try {
    await recordInboundSession({
      storePath,
      sessionKey: ctxPayload.SessionKey,
      ctx: ctxPayload,
      updateLastRoute: {
        sessionKey: ctxPayload.SessionKey,
        channel: "buz",
        to: toTarget,
        accountId,
      },
      onRecordError: (err) => {
        console.error("[buz inbound] failed to record session:", err);
      },
    });
    console.log("[buz inbound] session recorded successfully");
  } catch (err: any) {
    console.error("[buz inbound] error recording session:", err.message);
  }

  const { onModelSelected, ...replyPipeline } = createChannelReplyPipeline({
    cfg,
    agentId,
    channel: "buz",
    accountId,
  });

  // Create the actual dispatcher using createReplyDispatcherWithTyping
  const { dispatcher, replyOptions } = createReplyDispatcherWithTyping({
    ...replyPipeline,
    deliver: async (payload: any, info: any) => {
      console.log(
        "[buz inbound] deliver called:",
        info.kind,
        "text:",
        payload.text?.substring(0, 50),
      );

      // Actually send the reply via gRPC
      if (payload.text) {
        try {
          await sendText({
            to: toTarget,
            text: payload.text,
            accountId,
            replyToId: inboundMsg.message_id,
          });
          console.log("[buz inbound] reply sent successfully via gRPC");
        } catch (err: any) {
          console.error("[buz inbound] failed to send reply:", err.message);
          throw err;
        }
      }
    },
    onError: (err: any, info: any) => {
      console.error(`[buz inbound] ${info.kind} reply failed:`, err);
    },
  });

  try {
    console.log("[buz inbound] dispatching inbound message...");
    await dispatchInboundMessage({
      ctx: ctxPayload as any,
      cfg,
      dispatcher,
      replyOptions: {
        ...replyOptions,
        disableBlockStreaming: true,
        onModelSelected,
      } as any,
    });
    console.log("[buz inbound] message dispatched successfully");
    ctx.log?.info(
      `[${accountId}] Successfully dispatched inbound message from ${inboundMsg.sender_id}`,
    );
  } catch (err: any) {
    console.error("[buz inbound] failed to dispatch:", err.message);
    ctx.log?.error(`[${accountId}] Failed to dispatch inbound message: ${err.message}`);
  }
  console.log("[buz inbound] =========================================");
}
