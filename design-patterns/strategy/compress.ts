/* ============================================================================
 * 1. Strategy interface – defines the variable behaviour
 * -------------------------------------------------------------------------- */
interface CompressionStrategy {
  /** Returns compressed bytes */
  compress(data: Uint8Array): Promise<Uint8Array>;
  /** File-name extension (for metadata / MIME type) */
  readonly extension: string;
}

/* ============================================================================
 * 2. Concrete strategies
 *    (in real life you’d call zlib / node:stream; here we just fake it)
 * -------------------------------------------------------------------------- */
class ZipCompression implements CompressionStrategy {
  readonly extension = '.zip';
  async compress(data: Uint8Array): Promise<Uint8Array> {
    console.log('→ Compressing with ZIP');
    return data.slice(); // TODO: real zip logic
  }
}

class GzipCompression implements CompressionStrategy {
  readonly extension = '.gz';
  async compress(data: Uint8Array): Promise<Uint8Array> {
    console.log('→ Compressing with GZIP');
    return data.slice(); // TODO: real gzip logic
  }
}

class BrotliCompression implements CompressionStrategy {
  readonly extension = '.br';
  async compress(data: Uint8Array): Promise<Uint8Array> {
    console.log('→ Compressing with Brotli');
    return data.slice(); // TODO: real brotli logic
  }
}

/* ============================================================================
 * 3. Context – owns the workflow and delegates compression
 * -------------------------------------------------------------------------- */
class BackupService {
  constructor(private readonly compressor: CompressionStrategy) { }

  async backup(filename: string, payload: Uint8Array): Promise<void> {
    const compressed = await this.compressor.compress(payload);
    const finalName = filename + this.compressor.extension;
    await this.upload(finalName, compressed);
    console.log(`✅ Backup done: ${finalName} (${compressed.length} bytes)`);
  }

  /** Stub: push bytes to S3 / GCS / Azure Blob */
  private async upload(key: string, data: Uint8Array) {
    console.log(`⬆️  Uploading ${key} …`);
    await new Promise(r => setTimeout(r, 300));   // simulate latency
  }
}

/* ============================================================================
 * 4. Client code – chooses a strategy at run-time
 * -------------------------------------------------------------------------- */
function pickStrategy(): CompressionStrategy {
  const compressAlgo: string = 'gzip';
  switch (compressAlgo) {
    case 'gzip': return new GzipCompression();
    case 'brotli': return new BrotliCompression();
    default: return new ZipCompression();
  }
}

(async () => {
  const compressor = pickStrategy();             // <-- pluggable algorithm
  const service = new BackupService(compressor);

  const fakeData = new TextEncoder().encode('Quarterly report …');
  await service.backup('report-q2-2025', fakeData);
})();
