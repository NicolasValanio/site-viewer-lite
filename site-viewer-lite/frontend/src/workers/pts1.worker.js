const HEADER_BYTES = 16;
const POINT_BYTES = 16;
const MAX_POINT_COUNT = 10_000_000;

let remainder = new Uint8Array(0);
let positions = null;
let colors = null;
let pointCount = 0;
let parsedPoints = 0;
let spacing = 0;
let hasHeader = false;
let failed = false;
let lastProgressAt = 0;

function sendError(code) {
  if (!failed) {
    failed = true;
    postMessage({ type: 'error', code });
  }
}

function mergeBytes(first, second) {
  if (!first.byteLength) {
    return second;
  }

  const merged = new Uint8Array(first.byteLength + second.byteLength);
  merged.set(first);
  merged.set(second, first.byteLength);
  return merged;
}

function parseHeader(bytes) {
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);

  if (magic !== 'PTS1') {
    sendError('INVALID_FORMAT');
    return false;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  pointCount = view.getUint32(4, true);
  spacing = view.getFloat32(8, true);

  if (!Number.isFinite(spacing) || spacing <= 0 || pointCount < 1 || pointCount > MAX_POINT_COUNT) {
    sendError('INVALID_FORMAT');
    return false;
  }

  positions = new Float32Array(pointCount * 3);
  colors = new Uint8Array(pointCount * 3);
  hasHeader = true;
  postMessage({ type: 'header', pointCount, parsedPoints, spacing });
  return true;
}

function reportProgress(force = false) {
  const now = Date.now();

  if (force || now - lastProgressAt >= 80) {
    lastProgressAt = now;
    postMessage({ type: 'progress', pointCount, parsedPoints, spacing });
  }
}

function processChunk(buffer) {
  if (failed) {
    return;
  }

  let bytes = mergeBytes(remainder, new Uint8Array(buffer));
  let offset = 0;

  if (!hasHeader) {
    if (bytes.byteLength < HEADER_BYTES) {
      remainder = bytes;
      return;
    }

    if (!parseHeader(bytes)) {
      return;
    }

    offset = HEADER_BYTES;
  }

  const recordCount = Math.floor((bytes.byteLength - offset) / POINT_BYTES);

  if (parsedPoints + recordCount > pointCount) {
    sendError('INVALID_FORMAT');
    return;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let index = 0; index < recordCount; index += 1) {
    const sourceOffset = offset + index * POINT_BYTES;
    const targetOffset = (parsedPoints + index) * 3;

    positions[targetOffset] = view.getFloat32(sourceOffset, true);
    positions[targetOffset + 1] = view.getFloat32(sourceOffset + 4, true);
    positions[targetOffset + 2] = view.getFloat32(sourceOffset + 8, true);
    colors[targetOffset] = view.getUint8(sourceOffset + 12);
    colors[targetOffset + 1] = view.getUint8(sourceOffset + 13);
    colors[targetOffset + 2] = view.getUint8(sourceOffset + 14);
  }

  parsedPoints += recordCount;
  remainder = bytes.slice(offset + recordCount * POINT_BYTES);
  reportProgress(parsedPoints === pointCount);
}

function finish() {
  if (failed) {
    return;
  }

  if (!hasHeader) {
    sendError('INVALID_FORMAT');
    return;
  }

  if (parsedPoints !== pointCount || remainder.byteLength) {
    sendError('TRUNCATED');
    return;
  }

  reportProgress(true);
  postMessage(
    {
      type: 'complete',
      colors: colors.buffer,
      pointCount,
      positions: positions.buffer,
      spacing
    },
    [positions.buffer, colors.buffer]
  );

  positions = null;
  colors = null;
}

self.onmessage = ({ data }) => {
  if (data.type === 'chunk') {
    processChunk(data.buffer);
  } else if (data.type === 'end') {
    finish();
  }
};
