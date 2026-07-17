import { describe, expect, it } from 'vitest';
import {
	assertMetadataImageSafe,
	inspectMetadataImage,
	MetadataImageSafetyError
} from './image-safety';

function pngChunk(type: string, data: Buffer): Buffer {
	const header = Buffer.alloc(8);
	header.writeUInt32BE(data.length, 0);
	header.write(type, 4, 'ascii');
	return Buffer.concat([header, data, Buffer.alloc(4)]);
}

function png(width: number, height: number, frames = 1): Buffer {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const animation = Buffer.alloc(8);
	animation.writeUInt32BE(frames, 0);
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		pngChunk('IHDR', ihdr),
		...(frames > 1 ? [pngChunk('acTL', animation)] : []),
		pngChunk('IEND', Buffer.alloc(0))
	]);
}

function gif(frameCount: number): Buffer {
	const frame = Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0, 0]);
	return Buffer.concat([
		Buffer.from('GIF89a', 'ascii'),
		Buffer.from([1, 0, 1, 0, 0, 0, 0]),
		...Array.from({ length: frameCount }, () => frame),
		Buffer.from([0x3b])
	]);
}

function jpeg(width: number, height: number): Buffer {
	const frame = Buffer.alloc(19);
	frame[0] = 0xff;
	frame[1] = 0xc0;
	frame.writeUInt16BE(17, 2);
	frame[4] = 8;
	frame.writeUInt16BE(height, 5);
	frame.writeUInt16BE(width, 7);
	frame[9] = 3;
	return Buffer.concat([Buffer.from([0xff, 0xd8]), frame, Buffer.from([0xff, 0xd9])]);
}

function webp(width: number, height: number, animated = false): Buffer {
	const payload = Buffer.alloc(10);
	payload[0] = animated ? 0x02 : 0;
	payload.writeUIntLE(width - 1, 4, 3);
	payload.writeUIntLE(height - 1, 7, 3);
	const chunk = Buffer.alloc(18);
	chunk.write('VP8X', 0, 'ascii');
	chunk.writeUInt32LE(payload.length, 4);
	payload.copy(chunk, 8);
	const result = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), chunk]);
	result.writeUInt32LE(result.length - 8, 4);
	return result;
}

function ico(): Buffer {
	const result = Buffer.alloc(26);
	result.writeUInt16LE(1, 2);
	result.writeUInt16LE(1, 4);
	result[6] = 16;
	result[7] = 16;
	result.writeUInt32LE(4, 14);
	result.writeUInt32LE(22, 18);
	return result;
}

describe('metadata image safety', () => {
	it('inspects each accepted static raster format', () => {
		expect(inspectMetadataImage(png(1200, 630), 'image/png')).toEqual({
			width: 1200,
			height: 630,
			frames: 1
		});
		expect(inspectMetadataImage(jpeg(640, 480), 'image/jpeg')).toEqual({
			width: 640,
			height: 480,
			frames: 1
		});
		expect(inspectMetadataImage(gif(1), 'image/gif')).toEqual({
			width: 1,
			height: 1,
			frames: 1
		});
		expect(inspectMetadataImage(webp(800, 450), 'image/webp')).toEqual({
			width: 800,
			height: 450,
			frames: 1
		});
		expect(inspectMetadataImage(ico(), 'image/x-icon')).toEqual({
			width: 16,
			height: 16,
			frames: 1
		});
	});

	it('rejects oversized decoded canvases for each asset kind', () => {
		expect(() => assertMetadataImageSafe(png(2048, 1024), 'image/png', 'favicon')).toThrow(
			'dimensions exceed the safety limit'
		);
		expect(() => assertMetadataImageSafe(png(4096, 4096), 'image/png', 'preview')).toThrow(
			'dimensions exceed the safety limit'
		);
	});

	it('rejects animated images before they are stored', () => {
		expect(() => assertMetadataImageSafe(png(32, 32, 2), 'image/png', 'favicon')).toThrow(
			'Animated remote favicon images are not allowed'
		);
		expect(() => assertMetadataImageSafe(gif(2), 'image/gif', 'preview')).toThrow(
			'Animated remote preview images are not allowed'
		);
		expect(() => assertMetadataImageSafe(webp(32, 32, true), 'image/webp', 'preview')).toThrow(
			'Animated remote preview images are not allowed'
		);
	});

	it('rejects malformed and unsupported image structures', () => {
		expect(() => inspectMetadataImage(Buffer.from('not an image'), 'image/png')).toThrow(
			MetadataImageSafetyError
		);
		expect(() => inspectMetadataImage(Buffer.alloc(32), 'image/avif')).toThrow(
			'The remote image format cannot be inspected safely'
		);
	});
});
