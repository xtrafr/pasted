export interface InspectedImage {
	width: number;
	height: number;
	frames: number;
}

interface ImageSafetyLimits {
	maxWidth: number;
	maxHeight: number;
	maxPixels: number;
	maxFrames: number;
}

const limitsByKind: Record<'favicon' | 'preview', ImageSafetyLimits> = {
	favicon: {
		maxWidth: 1_024,
		maxHeight: 1_024,
		maxPixels: 1_048_576,
		maxFrames: 1
	},
	preview: {
		maxWidth: 4_096,
		maxHeight: 4_096,
		maxPixels: 12_000_000,
		maxFrames: 1
	}
};

export class MetadataImageSafetyError extends Error {
	readonly code = 'unsafe_image';

	constructor(message: string) {
		super(message);
		this.name = 'MetadataImageSafetyError';
	}
}

function invalidImage(message = 'The remote image structure is invalid'): never {
	throw new MetadataImageSafetyError(message);
}

function readUInt24LE(bytes: Buffer, offset: number): number {
	if (offset + 3 > bytes.length) invalidImage();
	return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

function assertPositiveDimensions(width: number, height: number): InspectedImage {
	if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
		invalidImage('The remote image has invalid dimensions');
	}
	return { width, height, frames: 1 };
}

function inspectPng(bytes: Buffer): InspectedImage {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature)) invalidImage();

	let offset = 8;
	let width: number | undefined;
	let height: number | undefined;
	let frames = 1;
	let sawEnd = false;
	while (offset + 12 <= bytes.length) {
		const chunkLength = bytes.readUInt32BE(offset);
		const dataStart = offset + 8;
		const dataEnd = dataStart + chunkLength;
		const chunkEnd = dataEnd + 4;
		if (chunkEnd > bytes.length) invalidImage();
		const type = bytes.toString('ascii', offset + 4, offset + 8);
		if (type === 'IHDR') {
			if (chunkLength !== 13 || width !== undefined) invalidImage();
			width = bytes.readUInt32BE(dataStart);
			height = bytes.readUInt32BE(dataStart + 4);
		} else if (type === 'acTL') {
			if (chunkLength !== 8) invalidImage();
			frames = bytes.readUInt32BE(dataStart);
		} else if (type === 'IEND') {
			if (chunkLength !== 0) invalidImage();
			sawEnd = true;
			break;
		}
		offset = chunkEnd;
	}
	if (width === undefined || height === undefined || !sawEnd || frames <= 0) invalidImage();
	return { ...assertPositiveDimensions(width, height), frames };
}

const jpegStartOfFrameMarkers = new Set([
	0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

function inspectJpeg(bytes: Buffer): InspectedImage {
	if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) invalidImage();
	let offset = 2;
	while (offset < bytes.length) {
		while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
		if (offset >= bytes.length) break;
		const marker = bytes[offset] ?? 0;
		offset += 1;
		if (marker === 0xd9 || marker === 0xda) break;
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
		if (offset + 2 > bytes.length) invalidImage();
		const segmentLength = bytes.readUInt16BE(offset);
		if (segmentLength < 2 || offset + segmentLength > bytes.length) invalidImage();
		if (jpegStartOfFrameMarkers.has(marker)) {
			if (segmentLength < 8) invalidImage();
			return assertPositiveDimensions(
				bytes.readUInt16BE(offset + 5),
				bytes.readUInt16BE(offset + 3)
			);
		}
		offset += segmentLength;
	}
	return invalidImage('The remote JPEG does not declare dimensions');
}

function skipGifSubBlocks(bytes: Buffer, start: number): number {
	let offset = start;
	while (offset < bytes.length) {
		const size = bytes[offset] ?? 0;
		offset += 1;
		if (size === 0) return offset;
		if (offset + size > bytes.length) invalidImage();
		offset += size;
	}
	return invalidImage();
}

function gifColorTableBytes(packed: number): number {
	return (packed & 0x80) === 0 ? 0 : 3 * 2 ** ((packed & 0x07) + 1);
}

function inspectGif(bytes: Buffer): InspectedImage {
	if (bytes.length < 14 || !['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) {
		invalidImage();
	}
	const width = bytes.readUInt16LE(6);
	const height = bytes.readUInt16LE(8);
	let offset = 13 + gifColorTableBytes(bytes[10] ?? 0);
	let frames = 0;
	let sawTrailer = false;

	while (offset < bytes.length) {
		const marker = bytes[offset] ?? 0;
		offset += 1;
		if (marker === 0x3b) {
			sawTrailer = true;
			break;
		}
		if (marker === 0x21) {
			if (offset >= bytes.length) invalidImage();
			offset = skipGifSubBlocks(bytes, offset + 1);
			continue;
		}
		if (marker !== 0x2c || offset + 9 > bytes.length) invalidImage();
		const packed = bytes[offset + 8] ?? 0;
		offset += 9 + gifColorTableBytes(packed);
		if (offset >= bytes.length) invalidImage();
		offset = skipGifSubBlocks(bytes, offset + 1);
		frames += 1;
	}

	if (!sawTrailer || frames === 0) invalidImage();
	return { ...assertPositiveDimensions(width, height), frames };
}

function inspectWebp(bytes: Buffer): InspectedImage {
	if (
		bytes.length < 20 ||
		bytes.toString('ascii', 0, 4) !== 'RIFF' ||
		bytes.toString('ascii', 8, 12) !== 'WEBP'
	) {
		invalidImage();
	}

	let offset = 12;
	let width: number | undefined;
	let height: number | undefined;
	let animationFlag = false;
	let animationFrames = 0;
	while (offset + 8 <= bytes.length) {
		const type = bytes.toString('ascii', offset, offset + 4);
		const chunkLength = bytes.readUInt32LE(offset + 4);
		const dataStart = offset + 8;
		const dataEnd = dataStart + chunkLength;
		if (dataEnd > bytes.length) invalidImage();

		if (type === 'VP8X') {
			if (chunkLength !== 10) invalidImage();
			animationFlag = ((bytes[dataStart] ?? 0) & 0x02) !== 0;
			width = readUInt24LE(bytes, dataStart + 4) + 1;
			height = readUInt24LE(bytes, dataStart + 7) + 1;
		} else if (type === 'VP8 ' && width === undefined) {
			if (
				chunkLength < 10 ||
				bytes[dataStart + 3] !== 0x9d ||
				bytes[dataStart + 4] !== 0x01 ||
				bytes[dataStart + 5] !== 0x2a
			) {
				invalidImage();
			}
			width = bytes.readUInt16LE(dataStart + 6) & 0x3fff;
			height = bytes.readUInt16LE(dataStart + 8) & 0x3fff;
		} else if (type === 'VP8L' && width === undefined) {
			if (chunkLength < 5 || bytes[dataStart] !== 0x2f) invalidImage();
			const b1 = bytes[dataStart + 1] ?? 0;
			const b2 = bytes[dataStart + 2] ?? 0;
			const b3 = bytes[dataStart + 3] ?? 0;
			const b4 = bytes[dataStart + 4] ?? 0;
			width = 1 + b1 + ((b2 & 0x3f) << 8);
			height = 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10);
		} else if (type === 'ANMF') {
			animationFrames += 1;
		}

		offset = dataEnd + (chunkLength % 2);
	}
	if (width === undefined || height === undefined) invalidImage();
	return {
		...assertPositiveDimensions(width, height),
		frames: animationFlag ? Math.max(2, animationFrames) : Math.max(1, animationFrames)
	};
}

function inspectIco(bytes: Buffer): InspectedImage {
	if (bytes.length < 22 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) {
		invalidImage();
	}
	const imageCount = bytes.readUInt16LE(4);
	if (imageCount === 0 || imageCount > 16 || 6 + imageCount * 16 > bytes.length) invalidImage();
	let width = 0;
	let height = 0;
	for (let index = 0; index < imageCount; index += 1) {
		const offset = 6 + index * 16;
		width = Math.max(width, bytes[offset] === 0 ? 256 : (bytes[offset] ?? 0));
		height = Math.max(height, bytes[offset + 1] === 0 ? 256 : (bytes[offset + 1] ?? 0));
		const size = bytes.readUInt32LE(offset + 8);
		const imageOffset = bytes.readUInt32LE(offset + 12);
		if (size === 0 || imageOffset + size > bytes.length) invalidImage();
	}
	return assertPositiveDimensions(width, height);
}

export function inspectMetadataImage(bytes: Buffer, mimeType: string): InspectedImage {
	switch (mimeType) {
		case 'image/png':
			return inspectPng(bytes);
		case 'image/jpeg':
			return inspectJpeg(bytes);
		case 'image/gif':
			return inspectGif(bytes);
		case 'image/webp':
			return inspectWebp(bytes);
		case 'image/x-icon':
		case 'image/vnd.microsoft.icon':
			return inspectIco(bytes);
		default:
			return invalidImage('The remote image format cannot be inspected safely');
	}
}

export function assertMetadataImageSafe(
	bytes: Buffer,
	mimeType: string,
	kind: 'favicon' | 'preview'
): InspectedImage {
	const image = inspectMetadataImage(bytes, mimeType);
	const limits = limitsByKind[kind];
	if (
		image.width > limits.maxWidth ||
		image.height > limits.maxHeight ||
		image.width * image.height > limits.maxPixels
	) {
		throw new MetadataImageSafetyError(`The remote ${kind} dimensions exceed the safety limit`);
	}
	if (image.frames > limits.maxFrames) {
		throw new MetadataImageSafetyError(`Animated remote ${kind} images are not allowed`);
	}
	return image;
}
