// Pure-JS client-side PKZip generator (Zero dependencies, binary Uint8Array)
export interface ZipFileEntry {
  name: string;
  data: Uint8Array | string;
}

export function createZipArchive(files: ZipFileEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDirEntries: Uint8Array[] = [];
  let offset = 0;

  function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  function crc32(bytes: Uint8Array): number {
    let c = 0 ^ (-1);
    for (let i = 0; i < bytes.length; i++) {
      c = (c >>> 8) ^ table[(c ^ bytes[i]) & 0xFF];
    }
    return (c ^ (-1)) >>> 0;
  }

  // Precompute CRC32 table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }

  files.forEach(file => {
    const fileBytes = typeof file.data === 'string' ? stringToBytes(file.data) : file.data;
    const nameBytes = stringToBytes(file.name);
    const crc = crc32(fileBytes);
    const uncompressedSize = fileBytes.length;
    const compressedSize = uncompressedSize;

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lView = new DataView(localHeader.buffer);
    lView.setUint32(0, 0x04034B50, true); // Local file header signature
    lView.setUint16(4, 20, true);         // Version needed (2.0)
    lView.setUint16(6, 0, true);          // General purpose bit flag
    lView.setUint16(8, 0, true);          // Compression method (0 = store)
    lView.setUint16(10, 0, true);         // File last mod time
    lView.setUint16(12, 0, true);         // File last mod date
    lView.setUint32(14, crc, true);       // CRC-32
    lView.setUint32(18, compressedSize, true);
    lView.setUint32(22, uncompressedSize, true);
    lView.setUint16(26, nameBytes.length, true);
    lView.setUint16(28, 0, true);         // Extra field length
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(fileBytes);

    // Central directory header (46 bytes + name)
    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(cdHeader.buffer);
    cView.setUint32(0, 0x02014B50, true); // Central directory header signature
    cView.setUint16(4, 20, true);         // Version made by
    cView.setUint16(6, 20, true);         // Version needed
    cView.setUint16(8, 0, true);          // General purpose bit flag
    cView.setUint16(10, 0, true);         // Compression method (0 = store)
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, crc, true);
    cView.setUint32(20, compressedSize, true);
    cView.setUint32(24, uncompressedSize, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);         // Extra field length
    cView.setUint16(32, 0, true);         // File comment length
    cView.setUint16(34, 0, true);         // Disk number start
    cView.setUint16(36, 0, true);         // Internal file attributes
    cView.setUint32(38, 0, true);         // External file attributes
    cView.setUint32(42, offset, true);    // Relative offset of local header
    cdHeader.set(nameBytes, 46);

    centralDirEntries.push(cdHeader);
    offset += localHeader.length + fileBytes.length;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;
  centralDirEntries.forEach(cd => {
    parts.push(cd);
    centralDirSize += cd.length;
  });

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054B50, true); // EOCD signature
  eView.setUint16(4, 0, true);          // Disk number
  eView.setUint16(6, 0, true);          // Start disk
  eView.setUint16(8, files.length, true);  // Number of central directory records on this disk
  eView.setUint16(10, files.length, true); // Total central directory records
  eView.setUint32(12, centralDirSize, true);
  eView.setUint32(16, centralDirOffset, true);
  eView.setUint16(20, 0, true);         // Comment length
  parts.push(eocd);

  return new Blob(parts as unknown as BlobPart[], { type: 'application/zip' });
}
