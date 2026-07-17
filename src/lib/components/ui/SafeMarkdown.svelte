<script lang="ts">
	import { parseSafeMarkdown, type MarkdownInline } from '$lib/markdown/safe-markdown';

	type RenderInline = MarkdownInline & { match: boolean };

	let {
		source,
		query = '',
		compact = false,
		label = 'Markdown note'
	}: {
		source: string;
		query?: string;
		compact?: boolean;
		label?: string;
	} = $props();

	const blocks = $derived(parseSafeMarkdown(source));

	function highlighted(inline: MarkdownInline): RenderInline[] {
		const terms = [
			...new Set(
				query
					.trim()
					.split(/\s+/)
					.map((term) => term.trim())
					.filter((term) => term.length >= 2)
			)
		];
		if (!inline.text || terms.length === 0) return [{ ...inline, match: false }];
		const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		const matcher = new RegExp(`(${escaped.join('|')})`, 'gi');
		return inline.text
			.split(matcher)
			.filter(Boolean)
			.map((text) => ({
				...inline,
				text,
				match: terms.some((term) => term.toLowerCase() === text.toLowerCase())
			}));
	}
</script>

{#snippet segmentText(segment: RenderInline)}
	{#if segment.match}<mark>{segment.text}</mark>{:else}{segment.text}{/if}
{/snippet}

{#snippet inlineContent(content: MarkdownInline[])}
	{#each content as inline, inlineIndex (`${inline.text}-${inlineIndex}`)}
		{#each highlighted(inline) as segment, segmentIndex (`${segment.text}-${segmentIndex}`)}
			{#if segment.href}
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={segment.href}
					target="_blank"
					rel="noopener noreferrer"
					referrerpolicy="no-referrer"
				>
					<span class:bold={segment.bold} class:italic={segment.italic} class:code={segment.code}
						>{@render segmentText(segment)}</span
					>
				</a>
			{:else if segment.code}
				<code class:bold={segment.bold} class:italic={segment.italic}
					>{@render segmentText(segment)}</code
				>
			{:else if segment.bold && segment.italic}
				<strong><em>{@render segmentText(segment)}</em></strong>
			{:else if segment.bold}
				<strong>{@render segmentText(segment)}</strong>
			{:else if segment.italic}
				<em>{@render segmentText(segment)}</em>
			{:else}
				{@render segmentText(segment)}
			{/if}
		{/each}
	{/each}
{/snippet}

<div class:compact class="safe-markdown" aria-label={label}>
	{#each blocks as block, blockIndex (blockIndex)}
		{#if block.type === 'heading'}
			<h3 class={`heading-${block.level}`}>{@render inlineContent(block.content)}</h3>
		{:else if block.type === 'paragraph'}
			<p>{@render inlineContent(block.content)}</p>
		{:else if block.type === 'blockquote'}
			<blockquote>{@render inlineContent(block.content)}</blockquote>
		{:else if block.type === 'unordered-list'}
			<ul>
				{#each block.items as item, itemIndex (itemIndex)}
					<li>{@render inlineContent(item)}</li>
				{/each}
			</ul>
		{:else if block.type === 'ordered-list'}
			<ol>
				{#each block.items as item, itemIndex (itemIndex)}
					<li>{@render inlineContent(item)}</li>
				{/each}
			</ol>
		{:else if block.type === 'code-block'}
			<pre><code>{block.value}</code></pre>
		{/if}
	{/each}
</div>

<style>
	.safe-markdown {
		display: grid;
		gap: 0.72em;
		min-width: 0;
		color: inherit;
		font: inherit;
		line-height: inherit;
		overflow-wrap: anywhere;
	}

	.safe-markdown.compact {
		max-height: 4.05em;
		overflow: hidden;
	}

	p,
	h3,
	blockquote,
	ul,
	ol,
	pre {
		margin: 0;
	}

	p,
	blockquote,
	li {
		white-space: pre-line;
	}

	h3 {
		font: inherit;
		font-weight: var(--font-weight-medium, 650);
		line-height: 1.25;
	}

	h3.heading-1 {
		font-size: 1.18em;
	}

	h3.heading-2 {
		font-size: 1.08em;
	}

	blockquote {
		border-left: 0.2rem solid var(--surface-accent, #2bee4b);
		padding-left: 0.8em;
	}

	ul,
	ol {
		display: grid;
		gap: 0.28em;
		padding-left: 1.35em;
	}

	a {
		color: inherit;
		text-decoration-thickness: 0.1em;
		text-underline-offset: 0.18em;
	}

	code,
	.code {
		border-radius: 0.22rem;
		background: var(--surface-subtle, #eef3ee);
		padding: 0.08em 0.28em;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.9em;
	}

	pre {
		overflow-x: auto;
		border: var(--border-hairline, 1px) solid var(--border-subtle, #d7ddd7);
		background: var(--surface-subtle, #eef3ee);
		padding: 0.75em;
		white-space: pre-wrap;
	}

	pre code {
		background: transparent;
		padding: 0;
		white-space: inherit;
	}

	.bold {
		font-weight: var(--font-weight-medium, 650);
	}

	.italic {
		font-style: italic;
	}

	mark {
		border-radius: 0.15em;
		background: color-mix(in srgb, var(--surface-accent, #2bee4b) 72%, transparent);
		color: inherit;
		padding: 0 0.06em;
	}
</style>
