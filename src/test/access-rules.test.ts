import { describe, expect, it } from "vitest";
import {
  assertCanRunResearch,
  generateInviteCode,
  isInviteCodeFormat,
  maskKey,
  normalizeProvider,
  PROVIDERS,
  validateTicker,
} from "@/lib/access-rules";

describe("bring-your-own-key rule", () => {
  it("blocks research when the account has no key of its own", () => {
    for (const provider of PROVIDERS) {
      expect(() => assertCanRunResearch({ hasOwnApiKey: false, provider })).toThrow(
        /Add your own .* API key/,
      );
    }
  });

  it("allows research once the account stored its own key", () => {
    expect(() => assertCanRunResearch({ hasOwnApiKey: true, provider: "openai" })).not.toThrow();
  });

  it("never leaks the stored key through the display hint", () => {
    const key = "sk-supersecretvalue-1234";
    const hint = maskKey(key);
    expect(hint).not.toContain("supersecret");
    expect(hint).toBe("•••••••• (configured)");
  });
});

describe("provider and ticker guards", () => {
  it("accepts a provider case-insensitively", () => {
    expect(normalizeProvider("OpenAI")).toBe("openai");
  });

  it("rejects an unknown provider", () => {
    expect(() => normalizeProvider("openai-x")).toThrow(/Unsupported provider/);
  });

  it("normalises tickers and rejects malformed ones", () => {
    expect(validateTicker("nvda")).toBe("NVDA");
    expect(() => validateTicker("")).toThrow(/valid ticker/);
    expect(() => validateTicker("1BAD")).toThrow(/valid ticker/);
  });
});

describe("invite codes", () => {
  it("generates codes in the format the sign-up form expects", () => {
    const code = generateInviteCode();
    expect(isInviteCodeFormat(code)).toBe(true);
    expect(isInviteCodeFormat("nope")).toBe(false);
  });

  it("generates a different code each time", () => {
    expect(generateInviteCode()).not.toBe(generateInviteCode());
  });
});
