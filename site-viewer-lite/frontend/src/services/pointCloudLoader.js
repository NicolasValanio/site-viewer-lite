import { isAbortError } from './api';

export class PointCloudError extends Error {
  constructor(message, code = 'POINT_CLOUD_ERROR') {
    super(message);
    this.name = 'PointCloudError';
    this.code = code;
  }
}

function createAbortError() {
  return new DOMException('Point cloud loading was cancelled.', 'AbortError');
}

function transferableBuffer(chunk) {
  if (chunk.byteOffset === 0 && chunk.byteLength === chunk.buffer.byteLength) {
    return chunk.buffer;
  }

  return chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
}

function errorForWorkerCode(code) {
  if (code === 'TRUNCATED') {
    return new PointCloudError('The point cloud download is incomplete. Try again.', code);
  }

  if (code === 'INVALID_FORMAT') {
    return new PointCloudError('The point cloud format is invalid. Try again.', code);
  }

  return new PointCloudError('The point cloud could not be processed. Try again.', code);
}

export function createPointCloudLoad({ projectId, token, onProgress }) {
  const controller = new AbortController();
  const worker = new Worker(new URL('../workers/pts1.worker.js', import.meta.url), { type: 'module' });
  let reader = null;
  let settled = false;
  let cancelled = false;
  let resolveLoad;
  let rejectLoad;

  const promise = new Promise((resolve, reject) => {
    resolveLoad = resolve;
    rejectLoad = reject;
  });

  function stopSource() {
    controller.abort();
    reader?.cancel().catch(() => {});
  }

  function reject(error) {
    if (settled) {
      return;
    }

    settled = true;
    stopSource();
    worker.terminate();
    rejectLoad(error);
  }

  function resolve(pointCloud) {
    if (settled) {
      return;
    }

    settled = true;
    worker.terminate();
    resolveLoad(pointCloud);
  }

  worker.onmessage = ({ data }) => {
    if (settled) {
      return;
    }

    if (data.type === 'header' || data.type === 'progress') {
      onProgress?.(data);
      return;
    }

    if (data.type === 'complete') {
      resolve(data);
      return;
    }

    if (data.type === 'error') {
      reject(errorForWorkerCode(data.code));
    }
  };

  worker.onerror = () => {
    reject(new PointCloudError('The point cloud could not be processed. Try again.'));
  };

  async function download() {
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/cloud`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new PointCloudError('Point cloud is not available for this project. Try again.', 'NOT_FOUND');
        }

        throw new PointCloudError('Unable to download the point cloud. Try again.', 'DOWNLOAD_FAILED');
      }

      if (!response.body) {
        throw new PointCloudError('Unable to download the point cloud. Try again.', 'NO_RESPONSE_BODY');
      }

      const totalBytes = Number(response.headers.get('content-length')) || null;
      let downloadedBytes = 0;
      reader = response.body.getReader();

      while (!settled) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        downloadedBytes += value.byteLength;
        onProgress?.({ type: 'download', downloadedBytes, totalBytes });
        const buffer = transferableBuffer(value);
        worker.postMessage({ type: 'chunk', buffer }, [buffer]);
      }

      if (!settled) {
        onProgress?.({ type: 'download-complete', downloadedBytes, totalBytes });
        worker.postMessage({ type: 'end' });
      }
    } catch (error) {
      if (settled || cancelled || isAbortError(error)) {
        return;
      }

      if (error instanceof PointCloudError) {
        reject(error);
      } else {
        reject(new PointCloudError('Unable to download the point cloud. Try again.', 'NETWORK_ERROR'));
      }
    }
  }

  download();

  return {
    cancel() {
      if (settled) {
        return;
      }

      cancelled = true;
      reject(createAbortError());
    },
    promise
  };
}
