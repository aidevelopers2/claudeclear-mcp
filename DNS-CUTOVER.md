# ClaudeClear domain cutover — handoff (do these in the morning)

Everything below is done except the Cloudflare DNS records (I don't have a Cloudflare API token).

## Step 1 — add 2 DNS records in Cloudflare (zone: removeclaudewatermark.com)

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A    | @ (removeclaudewatermark.com) | `76.76.21.21` | DNS only (grey) | Auto |
| CNAME | www.removeclaudewatermark.com | `cname.vercel-dns.com` | DNS only (grey) | Auto |

Same pattern as the other 4 converter domains (apex A + www CNAME, DNS-only).

## Step 2 — confirm Vercel picks it up

Domain + www are ALREADY attached to the `removeclaudewatermark-com` Vercel project
(done 16 Aug 2026). Once DNS resolves, Vercel auto-verifies and issues SSL (usually 1-5 min).

Verify with:
```
vercel domains inspect removeclaudewatermark.com
curl -I https://removeclaudewatermark.com
curl -I https://www.removeclaudewatermark.com
```

## Step 3 — point the MCP server at the real domain and redeploy

The deployed MCP server (`claudeclear-mcp.vercel.app`) calls the rewrite API at
`https://removeclaudewatermark-com.vercel.app` (so it kept working while the domain was down).

Flip it after Step 2 confirms the domain is live:
```
vercel env rm CLAUDECLEAR_API_URL production   # in claudeclear-mcp/mcp-web
vercel env add CLAUDECLEAR_API_URL production <<< "https://removeclaudewatermark.com"
vercel --prod --yes
```

Then confirm a tools/call through the MCP endpoint works against the real domain.

## Step 4 — webhook + base-URL sanity

- Stripe webhook endpoint URL in Stripe dashboard is already the Vercel URL; switch it to
  `https://removeclaudewatermark.com/api/stripe/webhook` once live (or leave — Vercel redirects
  vercel.app → no, it does NOT redirect automatically; do this manually).
- Re-run a smoke pass of /login, /register, /pricing and a paid-checkout test.

## What was NOT done (blocked)

- Cloudflare DNS records (no CF API token on this machine).
- The webhook/base-URL flip (must wait for the domain).
