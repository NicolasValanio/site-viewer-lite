import { computed, ref, shallowRef } from 'vue';
import { isAbortError } from '../services/api';
import { createPointCloudLoad } from '../services/pointCloudLoader';

export function usePointCloud() {
  const pointCloud = shallowRef(null);
  const state = ref('idle');
  const error = ref('');
  const progress = ref({
    downloadedBytes: 0,
    parsedPoints: 0,
    pointCount: 0,
    totalBytes: null
  });

  let activeLoad = null;
  let loadVersion = 0;
  let lastRequest = null;
  let lastDownloadUpdate = 0;

  const isLoading = computed(() => state.value === 'loading');

  function resetProgress() {
    progress.value = {
      downloadedBytes: 0,
      parsedPoints: 0,
      pointCount: 0,
      totalBytes: null
    };
  }

  function cancel() {
    loadVersion += 1;
    activeLoad?.cancel();
    activeLoad = null;
    pointCloud.value = null;
    error.value = '';
    state.value = 'idle';
    resetProgress();
    lastRequest = null;
  }

  async function load(request) {
    cancel();
    const version = ++loadVersion;
    lastRequest = request;
    state.value = 'loading';
    lastDownloadUpdate = 0;

    activeLoad = createPointCloudLoad({
      ...request,
      onProgress: (update) => {
        if (version !== loadVersion) {
          return;
        }

        if (update.type === 'download' || update.type === 'download-complete') {
          const now = performance.now();
          const isComplete = update.type === 'download-complete';

          if (!isComplete && now - lastDownloadUpdate < 80) {
            return;
          }

          lastDownloadUpdate = now;
          progress.value = {
            ...progress.value,
            downloadedBytes: update.downloadedBytes,
            totalBytes: update.totalBytes
          };
          return;
        }

        if (update.type === 'header' || update.type === 'progress') {
          progress.value = {
            ...progress.value,
            parsedPoints: update.parsedPoints,
            pointCount: update.pointCount
          };
        }
      }
    });

    try {
      const cloud = await activeLoad.promise;

      if (version !== loadVersion) {
        return;
      }

      pointCloud.value = { ...cloud, projectId: request.projectId };
      progress.value = {
        ...progress.value,
        parsedPoints: cloud.pointCount,
        pointCount: cloud.pointCount
      };
      state.value = 'loaded';
      error.value = '';
    } catch (loadError) {
      if (version !== loadVersion || isAbortError(loadError)) {
        return;
      }

      pointCloud.value = null;
      state.value = 'error';
      error.value = loadError.message;
    } finally {
      if (version === loadVersion) {
        activeLoad = null;
      }
    }
  }

  function retry() {
    if (lastRequest) {
      return load(lastRequest);
    }
  }

  return {
    cancel,
    error,
    isLoading,
    load,
    pointCloud,
    progress,
    retry,
    state
  };
}
