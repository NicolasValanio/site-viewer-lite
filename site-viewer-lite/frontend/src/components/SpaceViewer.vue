<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SpaceScene } from '../viewer/SpaceScene';
import LevelFilter from './LevelFilter.vue';
import SpaceInfoPanel from './SpaceInfoPanel.vue';

const props = defineProps({
  project: { type: Object, required: true },
  selectedSpaceId: { type: String, default: '' },
  spaces: { type: Array, required: true }
});

const emit = defineEmits(['update:selectedSpaceId']);
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

function updateSpaces() {
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

onBeforeUnmount(() => scene?.dispose());
</script>

<template>
  <section class="card space-viewer" aria-labelledby="viewer-heading">
    <header class="space-viewer-header">
      <div>
        <p class="eyebrow">Site spaces</p>
        <h2 id="viewer-heading">3D space viewer</h2>
      </div>
      <LevelFilter :levels="project.levels" :model-value="activeLevel" @update:model-value="selectLevel" />
    </header>

    <div class="level-legend" aria-label="Level color legend">
      <span v-for="item in levelColors" :key="item.level">
        <i :style="{ backgroundColor: item.color }"></i>{{ item.level }}
      </span>
    </div>

    <div ref="container" class="space-viewer-stage">
      <p v-if="viewerError" class="viewer-error">{{ viewerError }}</p>
    </div>

    <SpaceInfoPanel :space="selectedSpace" :unit="unit" @toggle-unit="toggleUnit" />
  </section>
</template>
