# Verification

## Automated checks

The repository suite contains 18 offline tests, passing on Node 26.13.0 and Bun 1.4.4. Run `node --test test.mjs` and `node --check adapter.mjs`. No credentials or network access are required.

Coverage includes predicate/choice/score mapping, multiple and reordered answers, refusals, response completeness, invalid distributions, score consistency, request limits, authentication errors, input-error redaction, cancellation, timeouts, account isolation, usage forwarding and plugin entry exports.

## Integration validation

Additional isolated validation used Magpie 0.1.2888 and Bun 1.4.4 with fictional authentication and mocked upstream responses. The complete Bun plugin host passed initialization, API login, model registration, loader and streamed RPC response checks.

The actual Go gateway passed intent-based model selection, automatic effort conversion from medium to high, fallback after executor HTTP 503, and default routing after classifier HTTP 401. Fictional keys embedded in error diagnostics were absent from client output and captured gateway logs. Test processes and listeners were confirmed stopped afterward.

These integration harnesses are local supporting evidence, not included in the public package. The graphical UI and live OpenAI API have not been tested. Promotional credits, billing and account-specific model access are not verified.

## Protocol references

Source contract reviewed at Magpie commit e17b6cefc7b25c19d1e522f9e8a9626bf68912d9:

- internal/plugin/host.js: factory discovery, API login and model registration.
- internal/provider/plugins.go: loader base URL and request-path rewriting.
- internal/gateway/decide.go: choice criteria and four-level score rubrics for classification and automatic effort.

OpenAI request and response definitions: https://developers.openai.com/api/reference/resources/decisions/methods/create

## Review and privacy

Independent review identified and resolved preprocessing deadline coverage, timeout configuration validation, and malformed JSON error disclosure. Required MIT attribution is preserved. Public files contain fictional test inputs and credentials; private runtime state, local paths, logs and integration evidence are excluded. Automated pattern scanning is supplemental and cannot guarantee detection of every possible secret.
