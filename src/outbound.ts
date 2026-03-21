import { activeStreams } from "./gateway.js";

function resolveTarget(to: string) {
  let chatType = "direct";
  let targetId = to;

  if (to.startsWith("buz:")) {
    targetId = to.substring("buz:".length);
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

export async function sendText(params: any) {
  const { to, text, accountId, replyToId, type = "final_reply", event } = params;

  console.log("[buz outbound] =========================================");
  console.log("[buz outbound] sendText called");
  console.log("[buz outbound] to:", to);
  console.log("[buz outbound] type:", type);
  console.log("[buz outbound] event:", event);
  console.log("[buz outbound] text preview:", text?.substring?.(0, 100));
  console.log("[buz outbound] text length:", text?.length);
  console.log("[buz outbound] accountId:", accountId);
  console.log("[buz outbound] replyToId:", replyToId);

  const targetAccountId = accountId || "default";
  const stream = activeStreams.get(targetAccountId);

  console.log("[buz outbound] targetAccountId:", targetAccountId);
  console.log("[buz outbound] activeStreams size:", activeStreams.size);
  console.log("[buz outbound] stream found:", !!stream);

  if (!stream) {
    console.error("[buz outbound] ERROR: No active gRPC stream for account", targetAccountId);
    console.log("[buz outbound] activeStreams keys:", Array.from(activeStreams.keys()));
    throw new Error(`[buz] No active gRPC stream for account ${targetAccountId}`);
  }

  const { chatType, targetId } = resolveTarget(to);

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

  try {
    stream.write(outboundMsg);
    console.log("[buz outbound] gRPC stream write successful");
  } catch (err: any) {
    console.error("[buz outbound] ERROR writing to stream:", err.message);
    throw err;
  }

  return { messageId: `msg-${Date.now()}`, chatId: to, type, event };
}
