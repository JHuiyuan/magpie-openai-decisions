# Magpie OpenAI Decisions

A decision-only Magpie provider translating System One requests to OpenAI Decisions. Supports intent classification and ordered effort scoring, not chat generation.

Status: validated with offline unit tests, the complete Bun plugin host and an isolated Magpie Go gateway using mock credentials and upstreams. A limited live choice integration has also been reported; see VERIFICATION.md for scope. The graphical UI remains untested. Not published to npm.

## Requirements and installation

Use a Magpie version supporting provider decide and model decides fields. Source contract reviewed at e17b6cefc7b25c19d1e522f9e8a9626bf68912d9. Node.js 22+ is required for offline tests; Magpie manages its plugin runtime.

Install from GitHub:

```sh
magpie plugin add github:JHuiyuan/magpie-openai-decisions
magpie plugin login openai-decisions
magpie plugin --json
```

Choose OpenAI API key and enter your existing project key inside Magpie. Select openai-decisions/gpt-6-luna as the routing group classifier. Magpie owns the login form and credential storage. The plugin does not read environment credentials, create keys or write credential files. Never include a key in source, issues or commits.

Magpie account validation may issue a billable decision probe. Promotional-credit eligibility and API/model access must be checked separately. The plugin does not implement a credit-balance check or spending cap.

## Configuration and support

The upstream is fixed to https://api.openai.com/v1/decisions. Custom origins and organization/project headers are not exposed. Use a project key for the intended project. The default timeout is 30000 ms; plugin options may supply a positive integer timeoutMs.

| System One request | OpenAI question | System One response |
| --- | --- | --- |
| noul or predicate | predicate | noul probability |
| choice with 2-255 string-keyed criteria | choice | choice, confidence, probability map |
| score with 2-10 ordered nonempty text criteria | score | fractional zero-based score, confidence, probability map |

State accepts text or a JSON object. Instructions accept text. Question names are preserved; 1-400 questions per request. Usage and cache counts are forwarded without inventing missing values or adding cache counts twice.

Magpie's reviewed automatic level detection and effort paths both supply four-item score rubrics. Genuine score requests without criteria are rejected. Images, conversation arrays and unknown request fields are unsupported. A refusal, missing answer or malformed probability fails the entire response, rather than silently selecting a route.

## Security and failure handling

Fixed upstream origin, disabled redirects, no automatic retries. Outbound headers are constructed explicitly rather than forwarded. One deadline covers request parsing, authentication, transport and response parsing; cancellation is isolated per request. HTTP error status is retained, while error bodies and exception details are suppressed. The plugin writes no logs; Magpie and OpenAI have their own storage policies.

## Development

No dependencies or install scripts:

```sh
node --test test.mjs
node --check adapter.mjs
```

Tests use injected fetch and fictional credentials, with no network or real key. See VERIFICATION.md for coverage and remaining gaps.

## Troubleshooting

- Provider missing: inspect magpie plugin --json and confirm decision-plugin support.
- 401/403: check account and model access through Magpie/OpenAI; do not share your key.
- 429: check API limits and billing; the adapter does not retry.
- Unsupported question: check the criteria shape above; unbounded scores are deliberately rejected.
- Cancelled or timed out: check classifier deadline and network availability.
- Invalid response: a refusal or malformed answer fails closed. Reproduce only with fictional data when filing reports.

## License

MIT. Derived from the Magpie Free Gateways provider interface. Original attribution is retained in LICENSE and NOTICE.md. Unrelated gateway, streaming and tool-handling code is not distributed.

## Integration example and caller fallback

This is a decision adapter, not a chat/completions provider, a budget manager or
a general implementation of every OpenAI Decisions feature. A System One request
accepted by the plugin looks like this (transport is managed by Magpie):

```json
{
  "model": "gpt-6-luna",
  "state": {"task": "Summarize a short article"},
  "questions": {
    "route": {
      "type": "choice",
      "instructions": "Select the best candidate.",
      "criteria": {"brief": "Short summary", "detailed": "Extended analysis"}
    }
  }
}
```

The adapter sends a named choice question to OpenAI. A valid upstream answer is
converted to an answer under answers.route with choice, confidence and a
probabilities map keyed by brief and detailed. These values come from the
upstream; the adapter does not manufacture probabilities or calibrate them.

Newer Magpie gateways can expose /v1/decisions and translate through their
System One provider path. That gateway route is distinct from the plugin's
internal /systemone interception and OpenAI's /v1/decisions endpoint. Use the
request format documented by your installed gateway, not this internal example,
when calling a gateway route directly.

To prefer Decisions with a conventional fallback, the caller must:

1. Define an allowed candidate set and a deterministic default.
2. Make the decision request with its own deadline and cancellation signal.
3. Accept only a complete, valid answer naming an allowed candidate.
4. On timeout, network failure, quota/access errors, refusal or invalid output,
   use its local rules or configured default.

The plugin fails closed and performs no retry or fallback itself. Magpie's route
group default behavior depends on the host version and configuration. A caller's
shorter deadline is separate from the plugin's default 30-second timeout; propagate
cancellation to avoid leaving an unwanted request running. A timeout is not proof
that the upstream performed no work or charged no tokens. Credit exhaustion does
not imply that every 429 is a credit error.

The timeoutMs factory option is for programmatic hosts/tests; no timeout setting
in Magpie's graphical UI is promised. Never paste a real key into an example.

## Project maintenance

See [CHANGELOG.md](CHANGELOG.md), [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md). Issues are disabled; use pull requests for non-sensitive
fixes. Releases and tags identify reviewed source, not guaranteed compatibility
with every future Magpie or OpenAI API version.
