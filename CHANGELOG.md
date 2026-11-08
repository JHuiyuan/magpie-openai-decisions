# Changelog

## 0.1.1 — 2026-11-08

- Clarify installation, protocol examples, caller fallback and timeout ownership.
- Correct current distribution attribution while retaining MIT copyright notices.
- Add contribution and security-reporting guidance without assuming Issues or
  private reporting are enabled.
- Document compatibility evidence and its limits; no new live API calls.
- Preserve the existing decision adapter runtime and minimal offline CI permissions.

## 0.1.0 — 2026-11-04

- Introduce the decision-only Magpie provider for gpt-6-luna.
- Translate predicate, bounded choice and rubric-based score requests.
- Validate answer completeness and distributions; sanitize failures and propagate
  cancellation under one deadline.
- Add offline tests and manual/push/pull-request CI triggers.
