/**
 * Verifies Node's built-in Blob (used in pdfmaker when creating in-memory PDF)
 * works the same way we use it: array of Buffer chunks + type "application/pdf".
 * This ensures we didn't break anything by removing the blob package.
 */
describe('Built-in Blob (pdfmaker in-memory path)', () => {
	it('uses globalThis.Blob and accepts Buffer chunks with type application/pdf', () => {
		expect(globalThis.Blob).toBeDefined();
		// Same pattern as pdfmaker create_simplestream when filepath is falsy
		const chunks = [Buffer.from('%PDF-1.4 fake pdf content', 'utf8')];
		const blob = new globalThis.Blob(chunks, { type: 'application/pdf' });
		expect(blob.type).toBe('application/pdf');
		expect(blob.size).toBeGreaterThan(0);
	});
});
