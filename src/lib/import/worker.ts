/// <reference lib="webworker" />

import { parseImport } from './parse';
import type { ImportInput, ImportResult, ParseImportOptions } from './types';

interface ImportWorkerRequest {
	id: string;
	input: ImportInput;
	options: ParseImportOptions;
}

type ImportWorkerResponse =
	| { id: string; ok: true; result: ImportResult }
	| { id: string; ok: false; error: { name: string; message: string } };

self.addEventListener('message', (event: MessageEvent<ImportWorkerRequest>) => {
	const { id, input, options } = event.data;
	let response: ImportWorkerResponse;
	try {
		response = { id, ok: true, result: parseImport(input, options) };
	} catch (error) {
		response = {
			id,
			ok: false,
			error: {
				name: error instanceof Error ? error.name : 'ImportError',
				message: error instanceof Error ? error.message : 'The import could not be analyzed.'
			}
		};
	}
	self.postMessage(response);
});

export {};
