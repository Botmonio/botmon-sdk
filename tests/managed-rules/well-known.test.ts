import { describe, it, expect } from "vitest";
import { handleWellKnown } from "../../src/managed-rules/well-known";

describe("handleWellKnown", () => {
  it("should serve JSON content with correct content type", async () => {
    const response = handleWellKnown("ai-plugin.json", {
      mode: "replace",
      content: "{\"schema_version\": \"v1\"}",
    });

    const body = await response.text();
    expect(body).toBe("{\"schema_version\": \"v1\"}");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("X-BotMon-Managed")).toBe("well-known");
    expect(response.headers.get("X-BotMon-File")).toBe("ai-plugin.json");
  });

  it("should serve text content with correct content type", async () => {
    const response = handleWellKnown("llms.txt", {
      mode: "replace",
      content: "LLM context information",
    });

    const body = await response.text();
    expect(body).toBe("LLM context information");
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("should return 404 when mode is disabled", async () => {
    const response = handleWellKnown("llms.txt", {
      mode: "disabled",
      content: "should not be served",
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 when content is missing", async () => {
    const response = handleWellKnown("llms.txt", {
      mode: "replace",
    });

    expect(response.status).toBe(404);
  });

  it("should infer content type for XML files", async () => {
    const response = handleWellKnown("custom.xml", {
      mode: "replace",
      content: "<root></root>",
    });

    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
  });

  it("should default to text/plain for unknown extensions", async () => {
    const response = handleWellKnown("unknown-file", {
      mode: "replace",
      content: "data",
    });

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });
});
