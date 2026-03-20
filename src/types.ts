/**
 * Buz Channel 类型定义
 */

export interface BuzConfig {
  enabled?: boolean;
  serverUrl?: string;
  secretKey?: string;
  accountId?: string;
  name?: string;
  allowFrom?: string[];
  defaultTo?: string;
  dm?: {
    policy?: "allowlist" | "blocklist" | "open";
    allowFrom?: string[];
  };
  groupPolicy?: "allowlist" | "open";
  groups?: Record<string, BuzGroupConfig>;
  accounts?: Record<string, BuzConfig>;
}

export interface BuzGroupConfig {
  name?: string;
  users?: string[];
  channels?: Record<string, BuzChannelConfig>;
}

export interface BuzChannelConfig {
  name?: string;
  users?: string[];
}

export interface ResolvedBuzAccount {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  name?: string;
  serverUrl?: string;
  secretKey?: string;
  allowFrom?: string[];
  defaultTo?: string;
  config: BuzConfig;
}

export interface BuzInboundMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  chatType: "direct" | "group";
  groupId?: string;
  contentText: string;
}

export interface BuzOutboundMessage {
  replyToId?: string;
  targetId: string;
  chatType: "direct" | "group";
  contentText: string;
}

export interface BuzRuntimeState {
  accountId: string;
  running: boolean;
  connected: boolean;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnect: Date | null;
  lastEventAt: Date | null;
  lastError: string | null;
}
