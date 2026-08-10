# Security Policy

## Supported versions

Purl is in pre-release. There are no stable releases yet, so only the latest commit on the default branch is supported. Security fixes land on the default branch and ship with the next release.

## Reporting a vulnerability

Please report security issues **privately**. Do not open a public issue for a vulnerability.

How to report:

1. Open a **GitHub Security Advisory** on the repository (the "Security" tab, then "Report a vulnerability"), or
2. Send a **private notification to the maintainers** through GitHub.

Include as much of the following as you can:

- The affected component (backend, frontend, preview iframe, rate limiting, and so on)
- Steps to reproduce
- The impact you observed
- A suggested fix, if you have one

You should receive an acknowledgment within a few days. We will keep you informed as the issue is triaged and fixed. Please give us a reasonable window to fix the issue before disclosing it publicly.

## Note on generated code execution

Purl renders LLM-generated HTML and JavaScript in the browser. We treat code-execution issues seriously, because a malicious or buggy generation could otherwise run in a user's session.

The preview iframe is sandboxed with `sandbox="allow-scripts"` and **without** `allow-same-origin`. That keeps generated code in a unique, opaque origin with no access to the parent page, its cookies, or its storage. Any change that weakens this isolation is a security regression and will be rejected in review.

## Threat model

| Area | Current posture |
|---|---|
| Generated code | Rendered in an iframe with `sandbox="allow-scripts"` only. No `allow-same-origin`, no `allow-top-navigation`, no `allow-forms`. |
| Rate limiting | In-memory sliding window: 100 requests/hour without a browser session id, 500/hour with one. Note: in-memory means limits reset on restart and apply per process. |
| Accounts | None. The app is anonymous-only and self-hosted; projects are scoped by a client-generated browser session id, which is not a security boundary. |
| Secrets | Never commit `.env` files or API keys. The repo's `.gitignore` excludes `.env`; the LLM API key is read from the environment only. |
| CORS | Restricted to the origins in `CORS_ORIGINS` (default `["http://localhost:5173"]`). |
| Cache | In-memory TTL cache keyed by a SHA-256 hash of prompt + theme + style. No user data is stored in cache keys. |
| LLM provider | The API key is passed to the configured OpenAI-compatible endpoint over HTTPS. The system prompt instructs the model not to generate malicious JavaScript. |

## Reporting expectations

- We aim to acknowledge reports within 3 business days.
- We aim to ship a fix for confirmed issues in the next release.
- We will credit reporters in the changelog unless they prefer to stay anonymous.

## Security-related configuration checklist

Before deploying Purl anywhere public:

- [ ] Set `CORS_ORIGINS` to your real frontend origin(s)
- [ ] Keep `LLM_API_KEY` in the environment, never in the repo
- [ ] Run behind HTTPS (reverse proxy or platform TLS)
- [ ] Review the rate limits (`RATE_LIMIT_ANON`, `RATE_LIMIT_FREE`) for your expected load
- [ ] Confirm the preview iframe still uses `sandbox="allow-scripts"` without `allow-same-origin`
