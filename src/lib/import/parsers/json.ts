import { ImportLimitError, assertCandidateCount, assertJsonDepth } from '../limits';
import { appendUrlsFromText, cleanTitle } from '../parser-utils';
import { truncateText } from '../unicode';
import type { ImportParser, RawParserResult } from '../types';

interface TraversalNode {
	value: unknown;
	path: string;
	depth: number;
	title: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pathForKey(path: string, key: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
		? `${path}.${key}`
		: `${path}[${JSON.stringify(key)}]`;
}

function objectTitle(value: Record<string, unknown>): string | undefined {
	for (const key of ['title', 'name', 'label']) {
		if (typeof value[key] === 'string') return cleanTitle(value[key]);
	}
	return undefined;
}

export const jsonParser: ImportParser = {
	format: 'json',
	parse(input, context): RawParserResult {
		assertJsonDepth(input.content, context.limits);
		let root: unknown;
		try {
			root = JSON.parse(input.content) as unknown;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown JSON error';
			throw new SyntaxError(`Invalid JSON import: ${message}`, { cause: error });
		}

		const candidates: RawParserResult['candidates'] = [];
		const stack: TraversalNode[] = [{ value: root, path: '$', depth: 0, title: undefined }];
		let visitedNodes = 0;
		let ignoredCount = 0;

		while (stack.length > 0) {
			const node = stack.pop();
			if (!node) break;
			visitedNodes += 1;
			if (visitedNodes > context.limits.maxJsonNodes) {
				throw new ImportLimitError(
					'json-nodes',
					context.limits.maxJsonNodes,
					`JSON contains more than ${context.limits.maxJsonNodes} values`
				);
			}
			if (node.depth > context.limits.maxJsonDepth) {
				throw new ImportLimitError(
					'json-depth',
					context.limits.maxJsonDepth,
					`JSON nesting exceeds the depth limit of ${context.limits.maxJsonDepth}`
				);
			}

			if (typeof node.value === 'string') {
				if (node.value.length > context.limits.maxStringLength) {
					throw new ImportLimitError(
						'string-length',
						context.limits.maxStringLength,
						`JSON string at ${node.path} exceeds the character limit`
					);
				}
				const count = appendUrlsFromText(candidates, node.value, context, {
					...(node.title ? { title: node.title } : {}),
					sourceLabel: node.path,
					sourceExcerpt: truncateText(node.value, context.limits.maxExcerptLength)
				});
				if (count === 0) ignoredCount += 1;
				continue;
			}

			if (Array.isArray(node.value)) {
				for (let index = node.value.length - 1; index >= 0; index -= 1) {
					stack.push({
						value: node.value[index],
						path: `${node.path}[${index}]`,
						depth: node.depth + 1,
						title: undefined
					});
				}
			} else if (isRecord(node.value)) {
				const entries = Object.entries(node.value);
				const title = objectTitle(node.value);
				for (let index = entries.length - 1; index >= 0; index -= 1) {
					const entry = entries[index];
					if (!entry) continue;
					const [key, value] = entry;
					stack.push({
						value,
						path: pathForKey(node.path, key),
						depth: node.depth + 1,
						title: /^(?:href|link|url)$/i.test(key) ? title : undefined
					});
				}
			}
			assertCandidateCount(candidates.length, context.limits);
		}

		return { format: 'json', candidates, ignoredCount, warnings: [] };
	}
};
