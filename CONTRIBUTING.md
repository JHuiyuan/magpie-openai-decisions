# Contributing

Use a pull request against main for a focused fix or documentation improvement.
Issues are currently disabled. Include the problem, expected behavior, compatibility
impact and offline test results. Use synthetic prompts and clearly fictional keys;
remove account identifiers, local paths and logs containing private data.

## Development

Use Node.js 22 or later. There are no dependencies or install scripts.

```sh
npm test
npm run check
npm pack --dry-run --ignore-scripts
```

Tests inject a mock transport; do not add live API calls or require secrets in CI.
Add regression coverage for changed protocol behavior. Keep index.mjs limited to
the plugin factory export: Magpie treats exported functions as factories.
Preserve MIT notices. Document unsupported mappings rather than inventing outputs.

## Versioning

Use 0.x semantic versions while the host/API compatibility contract is evolving.
Update package.json and CHANGELOG.md together. Tag reviewed commits as vX.Y.Z
after checks pass. A tag identifies source; it does not publish an npm package.
The package remains private. Runtime integration changes need targeted host checks;
document precisely which checks used mocks and which used a live service.

For sensitive reports, follow [SECURITY.md](SECURITY.md) instead of opening a public PR.
