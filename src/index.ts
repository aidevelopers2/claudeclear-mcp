#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "node:http";

const BASE_URL = process.env.CLAUDECLEAR_API_URL || "https://removeclaudewatermark.com";

/** fetch with an abort timeout so a hung upstream can't leave a tool call pending forever. */
async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 120_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createMcpServer() {
  const server = new McpServer(
    { name: "claudeclear", version: "1.0.1" },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    },
  );

  server.registerTool(
    "rewrite_text",
    {
      title: "Rewrite text to remove the Claude watermark",
      description:
        "Rewrites a passage of text at the sentence and clause level, preserving meaning, facts, numbers, names, and code, while removing the statistical pattern that Claude content detectors flag. Use this to clean text copied from Claude, Claude Code, or the Claude API before publishing.",
      inputSchema: {
        text: z.string().min(1).describe("The text to rewrite. Up to ~30,000 characters per call. For longer documents, split into parts and call multiple times."),
      },
    },
    async ({ text }: { text: string }) => {
      // Key is read lazily so the server can still start and expose the free
      // strip_image_metadata tool without a key configured.
      const apiKey = process.env.CLAUDECLEAR_API_KEY;
      if (!apiKey) {
        return {
          isError: true,
          content: [{ type: "text", text: "Missing CLAUDECLEAR_API_KEY. Get one at https://removeclaudewatermark.com/account and set it in your MCP client config." }],
        };
      }
      try {
        const res = await fetchWithTimeout(`${BASE_URL}/api/v1/rewrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ text }),
        });

        const data = await res.json().catch(() => ({} as Record<string, unknown>));

        if (!res.ok) {
          return {
            isError: true,
            content: [{ type: "text", text: `Rewrite failed (${res.status}): ${(data as { error?: string }).error || "unknown error"}` }],
          };
        }

        const d = data as { rewritten?: string; words?: number; invisibleCharsStripped?: number; check?: { ok: boolean; issues?: string[] } | null };
        if (typeof d.rewritten !== "string") {
          return {
            isError: true,
            content: [{ type: "text", text: "Rewrite failed: the server returned an unexpected response." }],
          };
        }

        const checkText = d.check
          ? d.check.ok
            ? "\n\nMeaning check: clean. Facts, numbers and code survived."
            : `\n\nMeaning check flagged issues:\n${(d.check.issues || []).map((i: string) => `- ${i}`).join("\n")}`
          : "";

        const stripText = d.invisibleCharsStripped
          ? `\n\nInvisible characters stripped: ${d.invisibleCharsStripped}`
          : "";

        return {
          content: [{ type: "text", text: d.rewritten + checkText + stripText }],
          structuredContent: {
            rewritten: d.rewritten,
            words: d.words,
            invisibleCharsStripped: d.invisibleCharsStripped ?? undefined,
            check: d.check,
          },
        };
      } catch (error) {
        const msg = error instanceof Error && error.name === "AbortError"
          ? "The request timed out."
          : error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: `Rewrite error: ${msg}` }],
        };
      }
    },
  );

  server.registerTool(
    "strip_image_metadata",
    {
      title: "Strip metadata from images (C2PA, EXIF, XMP)",
      description:
        "Removes C2PA 'Made with Claude' credentials, EXIF, XMP, ICC, and all other metadata from images. Supports JPG, PNG, WebP, GIF, TIFF. Free to use, no API key required. Returns the cleaned image as a downloadable file.",
      inputSchema: {
        image_url: z.string().url().describe("URL of the image to strip metadata from"),
      },
    },
    async ({ image_url }: { image_url: string }) => {
      try {
        // Fetch the image
        const imageRes = await fetchWithTimeout(image_url, {}, 60_000);
        if (!imageRes.ok) {
          return {
            isError: true,
            content: [{ type: "text", text: `Failed to fetch image: ${imageRes.status}` }],
          };
        }

        const imageBuffer = await imageRes.arrayBuffer();
        const filename = image_url.split("/").pop() || "image.jpg";

        // Send to strip-metadata API
        const formData = new FormData();
        formData.append("file", new Blob([imageBuffer]), filename);

        const res = await fetchWithTimeout(`${BASE_URL}/api/strip-metadata`, {
          method: "POST",
          body: formData,
        }, 60_000);

        if (!res.ok) {
          const data = await res.json().catch(() => ({} as Record<string, unknown>));
          return {
            isError: true,
            content: [{ type: "text", text: `Metadata strip failed (${res.status}): ${(data as { error?: string }).error || "unknown error"}` }],
          };
        }

        const metadataRemoved = res.headers.get("X-Metadata-Removed") || "";
        const originalSize = res.headers.get("X-Original-Size") || "0";
        const cleanedSize = res.headers.get("X-Cleaned-Size") || "0";
        const cleanFilename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || filename;

        return {
          content: [{
            type: "text",
            text: `Metadata stripped successfully!\n\nOriginal: ${originalSize} bytes\nCleaned: ${cleanedSize} bytes\nRemoved: ${metadataRemoved}\nFile: ${cleanFilename}`,
          }],
          structuredContent: {
            success: true,
            originalSize: parseInt(originalSize),
            cleanedSize: parseInt(cleanedSize),
            metadataRemoved: metadataRemoved.split(", "),
            cleanFilename,
          },
        };
      } catch (error) {
        const msg = error instanceof Error && error.name === "AbortError"
          ? "The request timed out."
          : error instanceof Error ? error.message : "Unknown error";
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${msg}` }],
        };
      }
    },
  );

  return server;
}

async function runStdio() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function runHttp() {
  const port = Number(process.env.PORT || 3311);

  // Stateless: a fresh server + transport per request. Connecting one server to
  // multiple transports throws, so we must NOT reuse a single server here.
  const httpServer = createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" }).end("Method Not Allowed");
      return;
    }
    (async () => {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    })().catch((e) => {
      console.error("HTTP request error:", e);
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "internal error" }));
    });
  });

  httpServer.listen(port, () => {
    console.error(`ClaudeRewrite MCP (HTTP) listening on http://localhost:${port}`);
  });
}

if (process.env.CLAUDECLEAR_MCP_HTTP === "1") {
  runHttp();
} else {
  runStdio().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
