import { activeStreams, isStreamReady, waitForReadyStream } from "./gateway.js";
import { getBuzRuntime } from "../index.js";

function resolveTarget(to: string) {
  let chatType = "direct";
  let targetId = (to || "").trim();

  if (targetId.startsWith("buz:")) {
    targetId = targetId.substring("buz:".length);
  }

  if (targetId.startsWith("group:")) {
    chatType = "group";
    targetId = targetId.substring("group:".length);
    if (targetId.includes(":")) {
      targetId = targetId.split(":")[0];
    }
  } else if (targetId.startsWith("user:")) {
    targetId = targetId.substring("user:".length);
  }

  return { chatType, targetId };
}

function markLastOutboundAt(accountId: string) {
  try {
    const runtime = getBuzRuntime();
    const helper = runtime?.channel?.status?.setAccountRuntimePatch;
    if (typeof helper === "function") {
      helper({
        channel: "buz",
        accountId,
        patch: { lastOutboundAt: Date.now() },
      });
    }
  } catch {
    // best effort only
  }
}

async function resolveWritableStream(accountId: string) {
  const existing = activeStreams.get(accountId);
  if (existing && isStreamReady(accountId)) {
    return existing;
  }
  return await waitForReadyStream(accountId, 3000);
}

export async function sendText(params: any) {
  const { to, text, accountId, replyToId, type = "final_reply", event } = params;

  const targetAccountId = String(accountId || "default").trim() || "default";
  const { chatType, targetId } = resolveTarget(String(to || ""));
  if (!targetId) {
    throw new Error("[buz] Missing targetId for outbound message");
  }

  const outboundMsg = {
    outbound_msg: {
      reply_to_id: replyToId || "",
      target_id: targetId,
      chat_type: chatType,
      content_text: text || "",
      type,
      event: event || "",
    },
  };

  console.log("[buz outbound] outboundMsg:", JSON.stringify(outboundMsg, null, 2));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const stream = await resolveWritableStream(targetAccountId);
      stream.write(outboundMsg);
      markLastOutboundAt(targetAccountId);
      console.log(`[buz outbound] gRPC stream write successful (attempt ${attempt})`);
      return { messageId: `msg-${Date.now()}`, chatId: to, type, event };
    } catch (err: any) {
      lastErr = err;
      console.error(`[buz outbound] ERROR writing to stream (attempt ${attempt}):`, err?.message || String(err));
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`[buz] Failed to send outbound message for account ${targetAccountId}`);
}
