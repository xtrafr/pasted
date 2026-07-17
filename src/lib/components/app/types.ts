export type ItemKind = 'link' | 'note' | 'reminder';

export interface ItemTag {
	id: string;
	name: string;
	color: string | null;
}

export interface LibraryItem {
	id: string;
	type: ItemKind;
	title: string | null;
	description: string | null;
	collectionId: string | null;
	state: 'active' | 'read' | 'broken';
	favorite: boolean;
	archived: boolean;
	sourceDate: Date | null;
	createdAt: Date;
	updatedAt: Date;
	originalUrl: string | null;
	normalizedUrl: string | null;
	domain: string | null;
	metadataTitle: string | null;
	metadataDescription: string | null;
	metadataState: 'pending' | 'fetching' | 'ready' | 'failed' | 'blocked' | null;
	noteBody: string | null;
	reminderDescription: string | null;
	dueAt: Date | null;
	reminderState: 'pending' | 'completed' | null;
	recurrence: string | null;
	collectionName: string | null;
	collectionColor: string | null;
	tags: ItemTag[];
}

export interface LibraryCollection {
	id: string;
	name: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	itemCount: number;
}

export interface LibraryTag {
	id: string;
	name: string;
	color: string | null;
	itemCount: number;
}
