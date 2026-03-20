import { defineChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

export default defineChannelSetupWizard({
  id: "buz",
  name: "Buz",
  description: "Connect OpenClaw to Buz IM via gRPC",
  steps: [
    {
      id: "config",
      title: "Configure Buz Connection",
      fields: [
        {
          id: "serverUrl",
          label: "Server URL",
          type: "string",
          required: true,
          placeholder: "e.g., buz-dc-ai.example.com:443",
          helpText: "The gRPC server address for Buz IM bridge",
        },
        {
          id: "secretKey",
          label: "Secret Key",
          type: "string",
          required: true,
          secret: true,
          placeholder: "e.g., buz_sk_xxxxxxxx",
          helpText: "Your Buz API secret key for authentication",
        },
        {
          id: "name",
          label: "Account Name",
          type: "string",
          required: false,
          placeholder: "e.g., My Buz Account",
          helpText: "A friendly name for this account (optional)",
        },
      ],
    },
  ],
  resolveConfig: (answers) => ({
    enabled: true,
    serverUrl: answers.config.serverUrl,
    secretKey: answers.config.secretKey,
    name: answers.config.name || "Buz",
  }),
});
