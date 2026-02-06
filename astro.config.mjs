// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
// import starlightBlog from 'starlight-blog';

// https://astro.build/config
export default defineConfig({
	site: 'https://schwanndenkuo.github.io',
	base: '/ai-agent-study',
	integrations: [
		starlight({
			defaultLocale: 'root',
			locales: {
				root: {
					label: 'English',
					lang: 'en',
				},
				'zh-tw': {
					label: '繁體中文',
					lang: 'zh-TW',
				},
			},
			favicon: '/favicon.ico',
			head: [
				// Add Mermaid for client-side diagram rendering
				{
					tag: 'script',
					attrs: {
						src: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
					},
				},
				// Add svg-pan-zoom for zoom/pan functionality
				{
					tag: 'script',
					attrs: {
						src: 'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js',
					},
				},
				{
					tag: 'script',
					content: `
						// Store original Mermaid source for re-rendering on theme change
						window.mermaidSources = [];

						function getCurrentTheme() {
							const theme = document.documentElement.getAttribute('data-theme');
							// Use 'neutral' for light mode (designed for readability) and 'dark' for dark mode
							return theme === 'light' ? 'neutral' : 'dark';
						}

						function addZoomControls(svg, index) {
							// Get the original SVG dimensions
							const bbox = svg.getBBox();
							const svgHeight = Math.max(bbox.height + 40, 300); // Add padding, min 300px

							// Add a container div for better control
							const container = document.createElement('div');
							container.className = 'mermaid-container';
							container.style.border = '1px solid var(--sl-color-gray-5)';
							container.style.borderRadius = '4px';
							container.style.overflow = 'visible';
							container.style.position = 'relative';
							container.style.marginBottom = '1rem';
							container.style.height = svgHeight + 'px';
							container.style.minHeight = '300px';

							// Add zoom controls hint
							const hint = document.createElement('div');
							hint.className = 'mermaid-hint';
							hint.style.position = 'absolute';
							hint.style.top = '8px';
							hint.style.right = '8px';
							hint.style.background = 'var(--sl-color-gray-6)';
							hint.style.color = 'var(--sl-color-white)';
							hint.style.padding = '4px 8px';
							hint.style.borderRadius = '4px';
							hint.style.fontSize = '12px';
							hint.style.zIndex = '10';
							hint.textContent = '🔍 Scroll to zoom, drag to pan';

							svg.parentNode.insertBefore(container, svg);
							container.appendChild(svg);
							container.appendChild(hint);

							// Set SVG to use full container height
							svg.style.width = '100%';
							svg.style.height = '100%';

							// Initialize pan-zoom
							try {
								svgPanZoom(svg, {
									zoomEnabled: true,
									controlIconsEnabled: true,
									fit: true,
									center: true,
									contain: false,
									minZoom: 0.5,
									maxZoom: 10,
									zoomScaleSensitivity: 0.3,
									beforePan: function() { return true; }
								});
								console.log('[Mermaid] Zoom enabled for diagram', index, 'height:', svgHeight);
							} catch (err) {
								console.error('[Mermaid] Failed to enable zoom:', err);
							}
						}

						async function renderMermaidDiagrams() {
							console.log('[Mermaid] Rendering diagrams with theme:', getCurrentTheme());

							// Remove existing containers and restore original mermaid divs with source text
							const containers = document.querySelectorAll('.mermaid-container');
							containers.forEach(container => {
								const mermaidDiv = container.querySelector('.mermaid');
								if (mermaidDiv) {
									const index = parseInt(mermaidDiv.getAttribute('data-block-index'));
									// Setting textContent removes all children including SVG
									mermaidDiv.textContent = window.mermaidSources[index];
									// Remove the data-processed attribute so Mermaid will re-render
									mermaidDiv.removeAttribute('data-processed');
									container.replaceWith(mermaidDiv);
								}
							});

							// Also restore any mermaid divs that have already been rendered but not in containers
							document.querySelectorAll('.mermaid').forEach(mermaidDiv => {
								const index = parseInt(mermaidDiv.getAttribute('data-block-index'));
								if (!isNaN(index) && window.mermaidSources[index]) {
									// Setting textContent removes all children including SVG
									mermaidDiv.textContent = window.mermaidSources[index];
									// Remove the data-processed attribute so Mermaid will re-render
									mermaidDiv.removeAttribute('data-processed');
								}
							});

							// Initialize Mermaid with current theme
							mermaid.initialize({
								startOnLoad: false,
								theme: getCurrentTheme(),
								logLevel: 'error'
							});

							// Small delay to ensure DOM is updated
							await new Promise(resolve => setTimeout(resolve, 50));

							// Render all diagrams - explicitly pass the nodes
							try {
								const elements = document.querySelectorAll('.mermaid');
								console.log('[Mermaid] Rendering', elements.length, 'diagrams');

								await mermaid.run({
									nodes: elements,
								});

								console.log('[Mermaid] Rendering complete, adding zoom controls...');

								document.querySelectorAll('.mermaid svg').forEach((svg, index) => {
									addZoomControls(svg, index);
								});
							} catch (err) {
								console.error('[Mermaid] Rendering failed:', err);
							}
						}

						window.addEventListener('load', function() {
							setTimeout(function() {
								console.log('[Mermaid] Starting conversion...');
								const mermaidBlocks = document.querySelectorAll('pre[data-language="mermaid"]');
								console.log('[Mermaid] Found', mermaidBlocks.length, 'blocks');

								mermaidBlocks.forEach((pre, index) => {
									const code = pre.querySelector('code');
									if (code) {
										// Get text content and clean it
										let content = code.innerText || code.textContent;

										// Store source for re-rendering
										window.mermaidSources.push(content);

										// Log first 100 chars for debugging
										console.log('[Mermaid] Block', index, ':', content.substring(0, 100));

										const div = document.createElement('div');
										div.className = 'mermaid';
										div.textContent = content;
										div.setAttribute('data-block-index', index);

										const figure = pre.closest('figure');
										if (figure) {
											figure.replaceWith(div);
										} else {
											pre.replaceWith(div);
										}
									}
								});

								// Initial render
								renderMermaidDiagrams();

								// Listen for theme changes (Starlight theme toggle)
								const observer = new MutationObserver((mutations) => {
									mutations.forEach((mutation) => {
										if (mutation.attributeName === 'data-theme') {
											console.log('[Mermaid] Theme changed, re-rendering diagrams...');
											renderMermaidDiagrams();
										}
									});
								});

								observer.observe(document.documentElement, {
									attributes: true,
									attributeFilter: ['data-theme']
								});
							}, 200);
						});
					`,
				},
			],
			title: 'AI Agent Tutorials',
			description:
				'Learn how to build production-ready AI agents with ReAct, Plan-Execute-Verify, and Human-in-the-Loop patterns',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/schwanndenkuo/ai-agent-study',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					translations: { 'zh-TW': '開始使用' },
					items: [
						{ label: 'Welcome', translations: { 'zh-TW': '歡迎' }, slug: 'index' },
						{ label: 'Case Study', translations: { 'zh-TW': '案例研究' }, slug: 'case-study' },
					],
				},
				{
					label: 'ReAct Pattern',
					translations: { 'zh-TW': 'ReAct 模式' },
					badge: { text: { en: 'Beginner', 'zh-TW': '初級' }, variant: 'success' },
					collapsed: false,
					items: [
						{
							label: '1. Overview',
							translations: { 'zh-TW': '1. 概述' },
							slug: 'react/01-overview',
						},
						{
							label: '2. Claude SDK',
							translations: { 'zh-TW': '2. Claude SDK' },
							slug: 'react/02-claude-implementation',
						},
						{
							label: '3. Multi-Provider',
							translations: { 'zh-TW': '3. 跨模型' },
							slug: 'react/03-multi-provider',
						},
					],
				},
				{
					label: 'Plan-Execute-Verify',
					translations: { 'zh-TW': '計畫-執行-驗證' },
					badge: { text: { en: 'Advanced', 'zh-TW': '進階' }, variant: 'tip' },
					collapsed: false,
					items: [
						{
							label: '1. Overview',
							translations: { 'zh-TW': '1. 概述' },
							slug: 'plan-execute-verify/01-overview',
						},
						{
							label: '2. Claude SDK',
							translations: { 'zh-TW': '2. Claude SDK' },
							slug: 'plan-execute-verify/02-claude-implementation',
						},
						{
							label: '3. Multi-Provider',
							translations: { 'zh-TW': '3. 跨模型' },
							slug: 'plan-execute-verify/03-multi-provider',
						},
					],
				},
				{
					label: 'Human-in-the-Loop',
					translations: { 'zh-TW': '人機協作' },
					badge: { text: { en: 'Interactive', 'zh-TW': '互動式' }, variant: 'note' },
					collapsed: false,
					items: [
						{
							label: 'Guide Index',
							translations: { 'zh-TW': '指南索引' },
							slug: 'human-in-the-loop/00-index',
						},
						{
							label: '1. Overview',
							translations: { 'zh-TW': '1. 概述' },
							slug: 'human-in-the-loop/01-overview',
						},
						{
							label: '2. Claude Code',
							translations: { 'zh-TW': '2. Claude Code' },
							slug: 'human-in-the-loop/02-claude-implementation',
						},
						{
							label: '3. OpenAI',
							translations: { 'zh-TW': '3. OpenAI' },
							slug: 'human-in-the-loop/03-openai-implementation',
						},
						{
							label: '4. Model Agnostic',
							translations: { 'zh-TW': '4. 跨模型' },
							slug: 'human-in-the-loop/04-model-agnostic',
						},
					],
				},
			],
			// Blog plugin temporarily disabled due to schema issues
			// plugins: [
			// 	starlightBlog({
			// 		title: 'Blog',
			// 		prefix: 'blog',
			// 		authors: {
			// 			default: {
			// 				name: 'Schwann',
			// 				title: 'AI Agent Developer',
			// 				picture: '', // Optional: add avatar URL later
			// 			},
			// 		},
			// 	}),
			// ],
			customCss: [
				// Optional: Add custom styles later if needed
			],
		}),
		sitemap(),
	],
});
