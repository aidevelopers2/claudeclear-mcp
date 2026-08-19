# ClaudeRewrite MCP Server

MCP server for [ClaudeRewrite](https://removeclaudewatermark.com) - the #1 Claude watermark removal tool.

## Tools

### `rewrite_text`
Rewrites text to remove Claude's statistical watermark. Preserves meaning, facts, numbers, and code while breaking the token pattern detectors flag.

### `strip_image_metadata`
Removes C2PA "Made with Claude" credentials, EXIF, XMP, ICC, and all other metadata from images. Supports JPG, PNG, WebP, GIF, TIFF.

## Install

```bash
npx claudeclear-mcp
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDECLEAR_API_KEY` | Yes (for rewrite) | Your API key from [removeclaudewatermark.com/account](https://removeclaudewatermark.com/account) |
| `CLAUDECLEAR_API_URL` | No | API base URL (default: `https://removeclaudewatermark.com`) |
| `CLAUDECLEAR_MCP_HTTP` | No | Set to `1` to run as HTTP server instead of stdio |

## Usage with Claude Code

Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "claudeclear": {
      "command": "npx",
      "args": ["claudeclear-mcp"],
      "env": {
        "CLAUDECLEAR_API_KEY": "your-api-key"
      }
    }
  }
}
```

## HTTP Mode

```bash
CLAUDECLEAR_MCP_HTTP=1 CLAUDECLEAR_API_KEY=your-key npx claudeclear-mcp
```

Server listens on port 3311 by default.

## License

MIT
