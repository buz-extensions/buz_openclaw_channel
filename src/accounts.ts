import type { ClawdbotConfig } from "openclaw/plugin-sdk/channel-runtime";
import type { BuzConfig, ResolvedBuzAccount } from "./types.js";

const DEFAULT_ACCOUNT_ID = "default";

export function listBuzAccountIds(cfg: ClawdbotConfig): string[] {
  const accounts = cfg.channels?.buz?.accounts;
  if (!accounts || Object.keys(accounts).length === 0) {
    return [DEFAULT_ACCOUNT_ID];
  }
  return Object.keys(accounts);
}

export function resolveDefaultBuzAccountId(cfg: ClawdbotConfig): string | null {
  const accounts = cfg.channels?.buz?.accounts;
  if (!accounts) return DEFAULT_ACCOUNT_ID;
  
  // 找到第一个启用的账号
  for (const [id, account] of Object.entries(accounts)) {
    if (account.enabled !== false) {
      return id;
    }
  }
  return Object.keys(accounts)[0] ?? DEFAULT_ACCOUNT_ID;
}

export function resolveBuzAccount({
  cfg,
  accountId,
}: {
  cfg: ClawdbotConfig;
  accountId?: string | null;
}): ResolvedBuzAccount {
  const buzCfg = cfg.channels?.buz as BuzConfig | undefined;
  const accounts = buzCfg?.accounts;
  
  const id = accountId ?? resolveDefaultBuzAccountId(cfg) ?? DEFAULT_ACCOUNT_ID;
  const accountConfig = accounts?.[id] as BuzConfig | undefined;
  
  // 合并全局配置和账号配置
  const mergedConfig: BuzConfig = {
    ...buzCfg,
    ...accountConfig,
  };

  const serverUrl = mergedConfig.serverUrl?.trim();
  const secretKey = mergedConfig.secretKey?.trim();
  const configured = Boolean(serverUrl && secretKey);

  return {
    accountId: id,
    enabled: mergedConfig.enabled !== false,
    configured,
    name: mergedConfig.name || id,
    serverUrl,
    secretKey,
    allowFrom: mergedConfig.allowFrom,
    defaultTo: mergedConfig.defaultTo,
    config: mergedConfig,
  };
}

export function listEnabledBuzAccounts(cfg: ClawdbotConfig): ResolvedBuzAccount[] {
  return listBuzAccountIds(cfg)
    .map((id) => resolveBuzAccount({ cfg, accountId: id }))
    .filter((account) => account.enabled && account.configured);
}
