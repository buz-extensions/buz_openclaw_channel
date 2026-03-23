import { getBuzRuntime } from "../index.js";
import { parseBuzTarget } from "./targets.js";

export function resolveBuzOutboundSessionRoute(params: any) {
  const parsed = parseBuzTarget(String(params?.target || ""));
  if (!parsed) {
    return null;
  }

  const runtime = getBuzRuntime();
  const buildAgentSessionKey = runtime?.channel?.routing?.buildAgentSessionKey;
  const chatType = parsed.kind === "group" ? "group" : "direct";
  const accountId = String(params?.accountId || "default");
  const baseSessionKey =
    typeof buildAgentSessionKey === "function"
      ? buildAgentSessionKey({
          agentId: params.agentId,
          channel: "buz",
          accountId,
          chatType,
          conversationId: parsed.id,
        })
      : `agent:${params.agentId}:buz:${accountId}:${chatType}:${parsed.id}`;

  return {
    sessionKey: baseSessionKey,
    baseSessionKey,
    peer: {
      kind: parsed.kind === "group" ? "group" : "direct",
      id: parsed.id,
    },
    chatType,
    from: parsed.kind === "group" ? `buz:group:${parsed.id}` : `buz:${parsed.id}`,
    to: parsed.kind === "group" ? `buz:group:${parsed.id}` : `buz:user:${parsed.id}`,
  };
}
