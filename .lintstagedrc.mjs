export default {
	// TypeScript/JavaScript/Astro files
	'*.{js,mjs,ts,astro}': ['eslint --fix', 'prettier --write'],

	// Markdown files - format and lint
	'*.{md,mdx}': ['prettier --write', 'markdownlint-cli2 --fix'],

	// JSON, YAML, CSS - format only
	'*.{json,jsonc,yml,yaml,css}': ['prettier --write'],

	// Check types (no auto-fix)
	'*.{ts,astro}': () => 'astro check',
};
