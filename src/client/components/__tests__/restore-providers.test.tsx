import { describe, it, expect } from "vitest";
import {
  createInitialDeployFormConfig,
  applySavedVarsToConfig,
  buildEnvFileContent,
  inferSavedInferenceProvider,
  inferSelectedProviders,
} from "../deploy-form/serialization.js";

describe("inferSelectedProviders (#122)", () => {
  it("returns only the primary provider when config is empty", () => {
    const config = createInitialDeployFormConfig();
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toEqual(["anthropic"]);
  });

  it("infers additional provider from model field", () => {
    const config = createInitialDeployFormConfig();
    config.openaiModel = "gpt-5";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("anthropic");
    expect(result).toContain("openai");
    expect(result).toHaveLength(2);
  });

  it("infers additional provider from models array", () => {
    const config = createInitialDeployFormConfig();
    config.googleModels = ["gemini-2.5-flash"];
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("google");
  });

  it("infers additional provider from API key", () => {
    const config = createInitialDeployFormConfig();
    config.openrouterApiKey = "sk-or-test";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("openrouter");
  });

  it("does not infer provider from SecretRef ID alone (default Podman mappings pre-populate these)", () => {
    const config = createInitialDeployFormConfig();
    config.openaiApiKeyRefId = "OPENAI_API_KEY";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).not.toContain("openai");
  });

  it("does not duplicate the primary provider", () => {
    const config = createInitialDeployFormConfig();
    config.anthropicModel = "claude-sonnet-4-6";
    config.anthropicModels = ["claude-opus-4-6"];
    const result = inferSelectedProviders(config, "anthropic");
    expect(result.filter((p) => p === "anthropic")).toHaveLength(1);
  });

  it("infers multiple additional providers", () => {
    const config = createInitialDeployFormConfig();
    config.openaiModel = "gpt-5";
    config.googleApiKey = "google-key";
    config.openrouterModel = "openrouter/auto";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("anthropic");
    expect(result).toContain("openai");
    expect(result).toContain("google");
    expect(result).toContain("openrouter");
    expect(result).toHaveLength(4);
  });

  it("infers vertex-anthropic from model field", () => {
    const config = createInitialDeployFormConfig();
    config.vertexAnthropicModel = "claude-sonnet-4-6";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("vertex-anthropic");
  });

  it("infers vertex-google from models array", () => {
    const config = createInitialDeployFormConfig();
    config.vertexGoogleModels = ["gemini-2.5-flash"];
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("vertex-google");
  });

  it("infers custom-endpoint from modelEndpoint URL", () => {
    const config = createInitialDeployFormConfig();
    config.modelEndpoint = "https://example.com/v1";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("custom-endpoint");
  });

  it("infers custom-endpoint from modelEndpointModel", () => {
    const config = createInitialDeployFormConfig();
    config.modelEndpointModel = "my-model";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("custom-endpoint");
  });

  it("infers custom-endpoint from modelEndpointApiKey", () => {
    const config = createInitialDeployFormConfig();
    config.modelEndpointApiKey = "ep-key-123";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("custom-endpoint");
  });

  it("infers openai-codex from codexModel", () => {
    const config = createInitialDeployFormConfig();
    config.codexModel = "gpt-5.4";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("openai-codex");
  });

  it("infers openai-codex from codexOauthAuthJsonPath", () => {
    const config = createInitialDeployFormConfig();
    config.codexOauthAuthJsonPath = "/home/user/.codex/auth.json";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).toContain("openai-codex");
  });

  it("does not infer a provider from empty strings and empty arrays", () => {
    const config = createInitialDeployFormConfig();
    // All fields are already "" and [] by default
    config.openaiModel = "";
    config.openaiModels = [];
    config.openaiApiKey = "";
    config.openaiApiKeyRefId = "";
    const result = inferSelectedProviders(config, "anthropic");
    expect(result).not.toContain("openai");
  });

  it("primary provider is always first in the returned array", () => {
    const config = createInitialDeployFormConfig();
    config.openaiModel = "gpt-5";
    const result = inferSelectedProviders(config, "google");
    expect(result[0]).toBe("google");
  });
});

describe("save/load round-trip preserves additional providers (#122)", () => {
  it("restores additional providers after buildEnvFileContent → applySavedVarsToConfig", () => {
    // 1. Set up a config with primary anthropic + additional openai and google
    const config = createInitialDeployFormConfig();
    config.agentName = "test";
    config.anthropicModel = "claude-sonnet-4-6";
    config.anthropicApiKey = "sk-ant-test";
    config.openaiModel = "gpt-5";
    config.openaiApiKey = "sk-openai-test";
    config.googleModel = "gemini-3.1-pro-preview";
    config.googleApiKey = "google-key";

    // 2. Save as env file content (simulates "Save .env")
    const envContent = buildEnvFileContent({
      config,
      inferenceProvider: "anthropic",
      isVertex: false,
      suggestedNamespace: "test-ns",
      selectedProviders: ["anthropic", "openai", "google"],
    });

    // 3. Parse the env file back into vars
    const vars: Record<string, string> = {};
    for (const line of envContent.split("\n")) {
      if (line.startsWith("#") || !line.includes("=")) continue;
      const eqIdx = line.indexOf("=");
      vars[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
    }

    // 4. Load the vars back into a fresh config
    const freshConfig = createInitialDeployFormConfig();
    const { config: restored } = applySavedVarsToConfig(vars, freshConfig);
    const primaryProvider = inferSavedInferenceProvider(vars)!;

    // 5. Infer which providers are active
    const inferred = inferSelectedProviders(restored, primaryProvider);

    // 6. Verify all three providers are restored
    expect(primaryProvider).toBe("anthropic");
    expect(inferred).toContain("anthropic");
    expect(inferred).toContain("openai");
    expect(inferred).toContain("google");
    expect(inferred).toHaveLength(3);

    // 7. Verify the provider data survived the round-trip
    expect(restored.anthropicModel).toBe("claude-sonnet-4-6");
    expect(restored.openaiModel).toBe("gpt-5");
    expect(restored.googleModel).toBe("gemini-3.1-pro-preview");
  });

  it("legacy single-provider config infers only the primary provider", () => {
    const vars: Record<string, unknown> = {
      INFERENCE_PROVIDER: "anthropic",
      ANTHROPIC_MODEL: "claude-sonnet-4-6",
      ANTHROPIC_API_KEY: "sk-ant-test",
    };
    const freshConfig = createInitialDeployFormConfig();
    const { config: restored } = applySavedVarsToConfig(vars, freshConfig);
    const primaryProvider = inferSavedInferenceProvider(vars)!;
    const inferred = inferSelectedProviders(restored, primaryProvider);

    expect(inferred).toEqual(["anthropic"]);
  });

  it("round-trips vertex-anthropic as additional provider", () => {
    const config = createInitialDeployFormConfig();
    config.agentName = "test";
    config.anthropicModel = "claude-sonnet-4-6";
    config.vertexAnthropicModel = "claude-sonnet-4-6";
    config.vertexAnthropicModels = ["claude-opus-4-6"];

    const envContent = buildEnvFileContent({
      config,
      inferenceProvider: "anthropic",
      isVertex: false,
      suggestedNamespace: "test-ns",
      selectedProviders: ["anthropic", "vertex-anthropic"],
    });

    const vars: Record<string, string> = {};
    for (const line of envContent.split("\n")) {
      if (line.startsWith("#") || !line.includes("=")) continue;
      const eqIdx = line.indexOf("=");
      vars[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
    }

    const freshConfig = createInitialDeployFormConfig();
    const { config: restored } = applySavedVarsToConfig(vars, freshConfig);
    const primaryProvider = inferSavedInferenceProvider(vars)!;
    const inferred = inferSelectedProviders(restored, primaryProvider);

    expect(inferred).toContain("anthropic");
    expect(inferred).toContain("vertex-anthropic");
    expect(restored.vertexAnthropicModel).toBe("claude-sonnet-4-6");
    expect(restored.vertexAnthropicModels).toEqual(["claude-opus-4-6"]);
  });
});
