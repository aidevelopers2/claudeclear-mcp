# ClaudeClear MCP — claudemarket.ai listing

## Form fields (submit at https://claudemarket.ai/submit)

- **Type**: MCP Server
- **Name**: claudeclear
- **Category**: MCP & Tooling / AI Writing & Content
- **Tags**: claude watermark, ai-detection, rewrite, writing, watermark removal
- **Server URL**: `https://removeclaudewatermark.com/api/mcp`
- **Website**: `https://removeclaudewatermark.com`
- **Install command**: `claude mcp add claudeclear --transport http https://removeclaudewatermark.com/api/mcp`

## Short description (one line)

Removes the invisible Claude watermark from any text by rewriting it at the sentence level, preserving meaning, facts, numbers, and code.

## Full description

ClaudeClear removes the invisible, machine-readable watermark Anthropic embeds in generated text. Rather than swapping a few words and hoping, it performs a structural rewrite at the sentence and clause level — the exact change the watermark wasn't built to survive — so the output no longer matches the statistical pattern detectors flag.

Use it on any passage copied from Claude, Claude Code, or the Claude API before you publish, submit, or reuse it. Meaning, facts, numbers, names, and code blocks survive intact, and every rewrite comes back with a meaning-check report confirming nothing important was lost.

Backed by the ClaudeClear rewrite API (removeclaudewatermark.com). Free to try; Pro plans for volume. One tool: `rewrite_text`.

## Key features

- Sentence- and clause-level rewrite, not word-swapping — preserves meaning, facts, numbers, names, and code
- Works on text from Claude, Claude Code, or the Claude API
- Meaning-check report on every rewrite (clean or flagged issues)
- Optional model override (any OpenRouter slug)
- Stateless streamable HTTP server — deploys serverless, no session state

## Install

Claude Code:
```
claude mcp add claudeclear --transport http https://removeclaudewatermark.com/api/mcp
```

Claude Desktop (claude_desktop_config.json):
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

## Tool reference

- `rewrite_text(text: string, model?: string)` — Rewrites a passage to remove the Claude watermark. Up to ~30,000 chars per call; split longer documents into parts.
