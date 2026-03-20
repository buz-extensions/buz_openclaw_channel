import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { buzPlugin, setBuzRuntime } from "./index.js";

export { buzPlugin, setBuzRuntime } from "./index.js";

export default defineSetupPluginEntry(buzPlugin);
