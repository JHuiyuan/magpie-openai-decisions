This project incorporates and adapts code from
`@magpie-community/opencode-zen-free-auth` (version 0.1.9), copyright
2026 xiaozhou26, licensed under MIT. `src/stream.mjs` and
`src/tool-response.mjs` are copied from that project. `src/zen.mjs` adapts
its provider, session ID, request header, streaming and tool handling code.
The upstream MIT notice is retained in [LICENSE](LICENSE).

Fork note: the paragraph above is the preserved upstream provenance notice.
This distribution retains the provider-interface adaptation but removes the
referenced src/stream.mjs, src/tool-response.mjs and src/zen.mjs modules.
The Decisions adapter and its tests are maintained separately in adapter.mjs
and test.mjs. Original copyright attribution remains in LICENSE.

