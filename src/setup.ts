export const setupAdapter = {
  validateInput: async (params: any) => {
    console.log("[buz setup] validateInput called with params:", {
      hasValues: !!params.values,
      hasInput: !!params.input,
      accountId: params.accountId,
      keys: Object.keys(params.values || params.input || {}),
    });

    const input = params.values || params.input || {};
    const { serverAddress, secretKey } = input;

    console.log("[buz setup] extracted values:", {
      hasServerAddress: !!serverAddress,
      hasSecretKey: !!secretKey,
      serverAddressLength: serverAddress?.length,
      secretKeyLength: secretKey?.length,
    });

    if (!serverAddress) return { ok: false, error: "Server Address is required" };
    if (!secretKey) return { ok: false, error: "Secret Key is required" };
    return { ok: true, values: input };
  },

  applyAccountConfig: async (params: any) => {
    const { cfg, accountId } = params;
    // OpenClaw passes "input" instead of "values"
    const input = params.input || params.values || {};
    const resolvedAccountId = accountId || "default";

    console.log("[buz setup] applyAccountConfig called:", {
      accountId,
      resolvedAccountId,
      hasCfg: !!cfg,
      hasInput: !!input,
      inputKeys: Object.keys(input),
      hasServerAddress: !!input.serverAddress,
      hasSecretKey: !!input.secretKey,
      existingChannelsKeys: Object.keys(cfg?.channels || {}),
    });

    // Deep clone to avoid mutations
    const newCfg = JSON.parse(JSON.stringify(cfg || {}));

    if (!newCfg.channels) {
      newCfg.channels = {};
      console.log("[buz setup] created new channels object");
    }

    const existingChannelCfg = newCfg.channels["buz"] || {};
    console.log("[buz setup] existing channel config:", {
      hasExisting: !!newCfg.channels["buz"],
      existingKeys: Object.keys(existingChannelCfg),
      existingAccountsKeys: Object.keys(existingChannelCfg.accounts || {}),
    });

    // Ensure the buz channel config exists with proper structure
    newCfg.channels["buz"] = {
      ...existingChannelCfg,
      enabled: true,
      accounts: {
        ...(existingChannelCfg.accounts || {}),
      },
    };

    // Set the account config
    newCfg.channels["buz"].accounts[resolvedAccountId] = {
      ...(newCfg.channels["buz"].accounts[resolvedAccountId] || {}),
      serverAddress: input.serverAddress,
      secretKey: input.secretKey,
      enabled: true,
    };

    console.log("[buz setup] account config set:", {
      accountId: resolvedAccountId,
      hasServerAddress: !!newCfg.channels["buz"].accounts[resolvedAccountId].serverAddress,
      hasSecretKey: !!newCfg.channels["buz"].accounts[resolvedAccountId].secretKey,
      allAccountIds: Object.keys(newCfg.channels["buz"].accounts),
    });

    // Clean up top-level fields for default account (they should be in accounts.default)
    if (resolvedAccountId === "default") {
      delete newCfg.channels["buz"].serverAddress;
      delete newCfg.channels["buz"].secretKey;
      console.log("[buz setup] cleaned up top-level fields for default account");
    }

    console.log("[buz setup] final config structure:", {
      channelsKeys: Object.keys(newCfg.channels),
      buzKeys: Object.keys(newCfg.channels["buz"]),
      buzEnabled: newCfg.channels["buz"].enabled,
      accountIds: Object.keys(newCfg.channels["buz"].accounts),
      defaultAccountKeys: Object.keys(newCfg.channels["buz"].accounts.default || {}),
    });

    // IMPORTANT: Return the entire cfg object, not just the channels part
    return { cfg: newCfg, accountId: resolvedAccountId };
  },
};
