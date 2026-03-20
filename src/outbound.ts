import { activeStreams } from "./gateway.js";

export async function sendText(params: any) {
  const { to, text, accountId, replyToId } = params;

  console.log("[buz outbound] =========================================");
  console.log("[buz outbound] sendText called");
  console.log("[buz outbound] to:", to);
  console.log("[buz outbound] text preview:", text?.substring(0, 100));
  console.log("[buz outbound] text length:", text?.length);
  console.log("[buz outbound] accountId:", accountId);
  console.log("[buz outbound] replyToId:", replyToId);

  const targetAccountId = accountId || "default";
  console.log("[buz outbound] targetAccountId:", targetAccountId);

  const stream = activeStreams.get(targetAccountId);
  console.log("[buz outbound] activeStreams size:", activeStreams.size);
  console.log("[buz outbound] stream found:", !!stream);

  if (!stream) {
    console.error("[buz outbound] ERROR: No active gRPC stream for account", targetAccountId);
    console.log("[buz outbound] activeStreams keys:", Array.from(activeStreams.keys()));
    throw new Error(`[buz] No active gRPC stream for account ${targetAccountId}`);
  }

  // to format might be: "buz:group:GROUP_ID" or "buz:USER_ID"
  // based on inbound parsing or explicit routing
  let chatType = "direct";
  let targetId = to;

  console.log("[buz outbound] parsing target:", to);

  if (to.startsWith("buz:")) {
    targetId = to.substring("buz:".length);
    console.log("[buz outbound] removed 'buz:' prefix, targetId:", targetId);
  }

  if (targetId.startsWith("group:")) {
    chatType = "group";
    targetId = targetId.substring("group:".length);
    console.log("[buz outbound] detected group chat, targetId:", targetId);
    // if targetId has a suffix like :sender_id, remove it for group target
    if (targetId.includes(":")) {
      targetId = targetId.split(":")[0];
      console.log("[buz outbound] removed sender suffix, final targetId:", targetId);
    }
  } else if (targetId.startsWith("user:")) {
    targetId = targetId.substring("user:".length);
    console.log("[buz outbound] removed 'user:' prefix, targetId:", targetId);
  }

  const outboundMsg = {
    outbound_msg: {
      reply_to_id: replyToId || "",
      target_id: targetId,
      chat_type: chatType,
      content_text: text,
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

  const result = { messageId: `msg-${Date.now()}`, chatId: to };
  return result;
}
