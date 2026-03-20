import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buzPlugin } from "./channel.js";
import type { ResolvedBuzAccount } from "./types.js";

describe("Buz Channel Plugin", () => {
  const mockAccount: ResolvedBuzAccount = {
    accountId: "test",
    enabled: true,
    configured: true,
    name: "Test Account",
    serverUrl: "localhost:9091",
    secretKey: "buz_sk_test",
    config: {},
  };

  describe("config.isConfigured", () => {
    it("should return true when serverUrl and secretKey are set", () => {
      const result = buzPlugin.config?.isConfigured?.(mockAccount);
      expect(result).toBe(true);
    });

    it("should return false when serverUrl is missing", () => {
      const account = { ...mockAccount, serverUrl: undefined, configured: false };
      const result = buzPlugin.config?.isConfigured?.(account);
      expect(result).toBe(false);
    });

    it("should return false when secretKey is missing", () => {
      const account = { ...mockAccount, secretKey: undefined, configured: false };
      const result = buzPlugin.config?.isConfigured?.(account);
      expect(result).toBe(false);
    });
  });

  describe("messaging.resolveOutboundSessionRoute", () => {
    it("should resolve direct message route", () => {
      const result = buzPlugin.messaging?.resolveOutboundSessionRoute?.({
        cfg: {},
        agentId: "test-agent",
        target: "user:12345",
      });

      expect(result).not.toBeNull();
      expect(result?.chatType).toBe("direct");
      expect(result?.peer.kind).toBe("direct");
    });

    it("should resolve group message route", () => {
      const result = buzPlugin.messaging?.resolveOutboundSessionRoute?.({
        cfg: {},
        agentId: "test-agent",
        target: "group:67890",
      });

      expect(result).not.toBeNull();
      expect(result?.chatType).toBe("group");
      expect(result?.peer.kind).toBe("channel");
    });

    it("should return null for empty target", () => {
      const result = buzPlugin.messaging?.resolveOutboundSessionRoute?.({
        cfg: {},
        agentId: "test-agent",
        target: "",
      });

      expect(result).toBeNull();
    });
  });

  describe("messaging.parseExplicitTarget", () => {
    it("should parse direct message target", () => {
      const result = buzPlugin.messaging?.parseExplicitTarget?.({ raw: "user:12345" });
      expect(result?.chatType).toBe("direct");
    });

    it("should parse group message target", () => {
      const result = buzPlugin.messaging?.parseExplicitTarget?.({ raw: "group:67890" });
      expect(result?.chatType).toBe("group");
    });
  });
});
