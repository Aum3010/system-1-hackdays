---
name: add-provider
description: Implement or change a server-side Launchpad AI provider while preserving the common provider contract and explicit demo behavior.
---

Read `CLAUDE.md`, `src/lib/ai/types.ts`, `src/lib/ai/demo.ts`, `src/lib/ai/provider.ts`, and `docs/MODULES.md` from the repository root.

Implement `AIProvider.complete` and `AIProvider.stream` using the provider's supported server SDK or API. Pass cancellation signals, bound output size, and set finite timeouts/retries. Keep secrets server-only and expose configuration readiness without exposing credential values.

Update the `AIProvider.id` union, server factory and status response, `.env.example`, Settings, and provider-specific labels in feature views together. The existing app has Demo Mode and one live adapter, not a multi-provider selector; implement a selector only if requested. An unavailable live provider must return a useful error; never silently substitute demo output. Maintain the NDJSON text/done/error contract in the chat route and its client consumer.

Mock transport to verify message/image mapping, signal forwarding, streaming and failure behavior without paid calls. Gate or clearly report unsupported image/stream capabilities rather than pretending success. Real provider testing requires the user's authorized credentials/use; mocked tests never certify credentials. Document capabilities and environment variables, then update PROJECT_STATUS.md with verification and next work.
