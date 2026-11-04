# ClaudeRewrite MCP connector

Rewrite Claude-generated text through a different, non-watermarking model so the statistical pattern in the wording no longer matches. Built by [ClaudeRewrite](https://removeclaudewatermark.com).

**One tool: `rewrite_text(text)`.** Sign in with your ClaudeRewrite account (OAuth) the first time you connect. There is no API key to copy.

## Connect

Connector URL: `https://removeclaudewatermark.com/api/mcp`

**Claude Code**

```bash
claude mcp add claudeclear --transport http https://removeclaudewatermark.com/api/mcp
```

Then run `/mcp` in Claude Code and choose Authenticate.

**Claude Desktop** (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "claudeclear": {
      "type": "http",
      "url": "https://removeclaudewatermark.com/api/mcp"
    }
  }
}
```

**Claude (web) and ChatGPT:** add the URL as a custom connector, then sign in and choose Allow.

Full setup: https://removeclaudewatermark.com/docs/mcp

## The tool

`rewrite_text(text: string)` rewrites a passage (up to about 30,000 characters per call) and returns the rewritten text. It is designed to keep facts, numbers, names and code intact; read the result before you publish it. It does not read your files, chats or history.

## Accounts and limits

Usage comes out of your ClaudeRewrite monthly word quota, the same one the website uses. Free accounts get a small free monthly allowance; paid plans get more ([pricing](https://removeclaudewatermark.com/pricing)). When your quota is used up, the tool says so and nothing is rewritten.

## Privacy and support

The connector receives only the text you ask it to rewrite and your account identifier. See the [privacy policy](https://removeclaudewatermark.com/privacy). Questions: [contact](https://removeclaudewatermark.com/contact).

## Other ways to use it

- **Website:** paste text at https://removeclaudewatermark.com
- **REST API** (paid plans): https://removeclaudewatermark.com/api-docs
- **Local stdio package** (bring your own API key from your account page): `npx claudeclear-mcp`, with `CLAUDECLEAR_API_KEY` set. This older package also includes a `strip_image_metadata` tool that removes C2PA and EXIF data from images.

ClaudeRewrite is independent and is not affiliated with Anthropic or OpenAI.

## License

MIT
