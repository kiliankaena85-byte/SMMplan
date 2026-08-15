import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiClient } from "../gemini-client";

describe("GeminiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return model from env if explicitly set", async () => {
    process.env.GEMINI_MODEL = "gemini-3.7-flash";
    const model = await GeminiClient.resolveLatestModel("mock-api-key");
    expect(model).toBe("gemini-3.7-flash");
    delete process.env.GEMINI_MODEL;
  });

  it("should fail gracefully and throw when GEMINI_API_KEY is missing", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await expect(
      GeminiClient.generateContent({
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      })
    ).rejects.toThrow("GEMINI_API_KEY is not configured");

    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
