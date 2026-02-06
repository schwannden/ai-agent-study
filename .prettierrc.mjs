/** @type {import("prettier").Config} */
export default {
	semi: true,
	singleQuote: true,
	tabWidth: 2,
	useTabs: true,
	trailingComma: 'es5',
	printWidth: 100,

	plugins: ['prettier-plugin-astro'],

	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
			},
		},
		{
			files: ['*.md', '*.mdx'],
			options: {
				proseWrap: 'preserve',
				useTabs: false,
				tabWidth: 2,
			},
		},
		{
			files: ['*.json', '*.jsonc'],
			options: {
				useTabs: false,
				tabWidth: 2,
			},
		},
	],
};
