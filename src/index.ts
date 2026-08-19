import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "node:http";

const API_KEY = process.env.CLAUDECLEAR_API_KEY;
if (!API_KEY) {
  console.error("Missing CLAUDECLEAR_API_KEY. Get one at https://removeclaudewatermark.com/account");
  if (process.env.CLAUDECLEAR_MCP_HTTP !== "1") process.exit(1);
}

const BASE_URL = process.env.CLAUDECLEAR_API_URL || "https://removeclaudewatermark.com";

export function createMcpServer() {
  const server = new McpServer(
    { name: "claudeclear", version: "1.0.0" },
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
      const res = await fetch(`${BASE_URL}/api/v1/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({ text }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Rewrite failed (${res.status}): ${data.error || "unknown error"}` }],
        };
      }

      const checkText = data.check
        ? data.check.ok
          ? "\n\nMeaning check: clean. Facts, numbers and code survived."
          : `\n\nMeaning check flagged issues:\n${(data.check.issues || []).map((i: string) => `- ${i}`).join("\n")}`
        : "";

      const stripText = data.invisibleCharsStripped
        ? `\n\nInvisible characters stripped: ${data.invisibleCharsStripped}`
        : "";

      return {
        content: [{ type: "text", text: data.rewritten + checkText + stripText }],
        structuredContent: {
          rewritten: data.rewritten,
          words: data.words,
          invisibleCharsStripped: data.invisibleCharsStripped ?? undefined,
          check: data.check,
        },
      };
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
        const imageRes = await fetch(image_url);
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

        const res = await fetch(`${BASE_URL}/api/strip-metadata`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            isError: true,
            content: [{ type: "text", text: `Metadata strip failed (${res.status}): ${data.error || "unknown error"}` }],
          };
        }

        const cleanedBuffer = await res.arrayBuffer();
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
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }],
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

async function runHttp() {
  const server = createMcpServer();
  const port = Number(process.env.PORT || 3311);

  const httpServer = createServer((req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    server.connect(transport).then(() => transport.handleRequest(req, res));
  });

  httpServer.listen(port, () => {
    console.error(`ClaudeRewrite MCP (HTTP) listening on http://localhost:${port}`);
  });
}

if (process.env.CLAUDECLEAR_MCP_HTTP === "1") {
  runHttp().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runStdio().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
