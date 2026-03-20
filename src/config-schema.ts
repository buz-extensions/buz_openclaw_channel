import { z } from "zod";

/**
 * Buz Channel 配置 Schema
 */

export const BuzChannelConfigSchema = z.object({
  enabled: z.boolean().optional().describe("是否启用该账号"),
  serverUrl: z.string().optional().describe("gRPC 服务器地址 (如: localhost:9091)"),
  secretKey: z.string().optional().describe("接入密钥 (如: buz_sk_xxxx)"),
  accountId: z.string().optional().describe("账号标识"),
  name: z.string().optional().describe("账号显示名称"),
  allowFrom: z.array(z.string()).optional().describe("允许列表"),
  defaultTo: z.string().optional().describe("默认发送目标"),
  dm: z.object({
    policy: z.enum(["allowlist", "blocklist", "open"]).optional(),
    allowFrom: z.array(z.string()).optional(),
  }).optional().describe("私信设置"),
  groupPolicy: z.enum(["allowlist", "open"]).optional().describe("群组策略"),
  groups: z.record(z.object({
    name: z.string().optional(),
    users: z.array(z.string()).optional(),
    channels: z.record(z.object({
      name: z.string().optional(),
      users: z.array(z.string()).optional(),
    })).optional(),
  })).optional().describe("群组配置"),
});

export type BuzChannelConfig = z.infer<typeof BuzChannelConfigSchema>;
