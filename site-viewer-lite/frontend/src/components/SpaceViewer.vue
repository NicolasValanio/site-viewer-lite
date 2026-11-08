<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SpaceScene } from '../viewer/SpaceScene';
import LevelFilter from './LevelFilter.vue';
import SpaceInfoPanel from './SpaceInfoPanel.vue';

const props = defineProps({
  cloudError: { type: String, default: '' },
  cloudProgress: { type: Object, required: true },
  cloudState: { type: String, required: true },
  pointCloud: { type: Object, default: null },
  project: { type: Object, required: true },
  selectedSpaceId: { type: String, default: '' },
  spaces: { type: Array, required: true }
});

const emit = defineEmits(['cancel-cloud', 'load-cloud', 'retry-cloud', 'update:selectedSpaceId']);
const container = ref(null);
const activeLevel = ref('all');
const unit = ref('m2');
const viewerError = ref('');
let scene = null;

const selectedSpace = computed(() => props.spaces.find((space) => space.id === props.selectedSpaceId) || null);
const levelColors = computed(() => props.project.levels.map((level, index) => ({
  level,
  color: ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'][index % 6]
})));
const isLoadingCloud = computed(() => props.cloudState === 'loading');
const downloadPercent = computed(() => {
  if (!props.cloudProgress.totalBytes) {
    return null;
  }

  return Math.min(100, Math.round((props.cloudProgress.downloadedBytes / props.cloudProgress.totalBytes) * 100));
});
const processingPercent = computed(() => {
  if (!props.cloudProgress.pointCount) {
    return 0;
  }

  return Math.min(100, Math.round((props.cloudProgress.parsedPoints / props.cloudProgress.pointCount) * 100));
});
const loadedPointCount = computed(() => props.pointCloud?.pointCount?.toLocaleString('en-US') || '');

function updateSpaces() {
  scene?.clearPointCloud();
  scene?.setSpaces(props.spaces, props.project.levels);
  scene?.setLevelFilter(activeLevel.value);
  scene?.setSelectedSpace(props.selectedSpaceId);
}

function selectLevel(level) {
  activeLevel.value = level;
  scene?.setLevelFilter(level);
}

function toggleUnit() {
  unit.value = unit.value === 'm2' ? 'ft2' : 'm2';
}

onMounted(async () => {
  await nextTick();

  try {
    scene = new SpaceScene(container.value, {
      onSelect: (spaceId) => emit('update:selectedSpaceId', spaceId)
    });
    updateSpaces();
  } catch {
    viewerError.value = 'WebGL is unavailable, so the 3D viewer cannot be displayed.';
  }
});

watch(
  () => props.project.id,
  () => {
    activeLevel.value = 'all';
    unit.value = 'm2';
    updateSpaces();
  }
);

watch(
  () => props.spaces,
  () => updateSpaces()
);

watch(
  () => props.selectedSpaceId,
  (spaceId) => scene?.setSelectedSpace(spaceId)
);

watch(
  () => props.pointCloud,
  (cloud) => {
    if (cloud) {
      scene?.setPointCloud(cloud);
    } else {
      scene?.clearPointCloud();
    }
  }
);

onBeforeUnmount(() => scene?.dispose());
</script>

<template>
  <section class="card space-viewer" aria-labelledby="viewer-heading">
    <header class="space-viewer-header">
      <div>
        <p class="eyebrow">Site spaces</p>
        <h2 id="viewer-heading">3D space viewer</h2>
      </div>
      <div class="viewer-toolbar">
        <LevelFilter :levels="project.levels" :model-value="activeLevel" @update:model-value="selectLevel" />
        <button v-if="!isLoadingCloud" class="primary-button cloud-button" type="button" @click="$emit('load-cloud')">
          {{ pointCloud ? 'Reload point cloud' : 'Load point cloud' }}
        </button>
        <button v-else class="secondary-button cloud-button" type="button" @click="$emit('cancel-cloud')">Cancel</button>
      </div>
    </header>

    <div class="level-legend" aria-label="Level color legend">
      <span v-for="item in levelColors" :key="item.level">
        <i :style="{ backgroundColor: item.color }"></i>{{ item.level }}
      </span>
    </div>

    <div ref="container" class="space-viewer-stage">
      <p v-if="viewerError" class="viewer-error">{{ viewerError }}</p>
    </div>

    <section v-if="isLoadingCloud || cloudState === 'loaded' || cloudError" class="cloud-load-status" aria-live="polite">
      <template v-if="isLoadingCloud">
        <div>
          <strong v-if="downloadPercent !== null">Downloading point cloud: {{ downloadPercent }}%</strong>
          <strong v-else>Downloading point cloud: {{ Math.round(cloudProgress.downloadedBytes / 1024) }} KB</strong>
          <progress v-if="downloadPercent !== null" :value="downloadPercent" max="100">{{ downloadPercent }}%</progress>
        </div>
        <div v-if="cloudProgress.pointCount">
          <strong>Processing point cloud: {{ processingPercent }}%</strong>
          <progress :value="processingPercent" max="100">{{ processingPercent }}%</progress>
        </div>
      </template>
      <p v-else-if="cloudState === 'loaded'">{{ loadedPointCount }} points loaded.</p>
      <div v-else class="cloud-error">
        <p>{{ cloudError }}</p>
        <button class="secondary-button" type="button" @click="$emit('retry-cloud')">Try again</button>
      </div>
    </section>

    <SpaceInfoPanel :space="selectedSpace" :unit="unit" @toggle-unit="toggleUnit" />
  </section>
</template>
