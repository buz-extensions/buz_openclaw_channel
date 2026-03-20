import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import { buzPlugin } from "./src/channel.js";

export { buzPlugin } from "./src/channel.js";
export { BuzGrpcClient } from "./src/grpc-client.js";

export default defineChannelPluginEntry({
  id: "buz",
  name: "Buz",
  description: "Buz IM channel plugin via gRPC bidirectional stream",
  plugin: buzPlugin,
});
