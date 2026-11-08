<script setup>
import { computed } from 'vue';

const props = defineProps({
  space: { type: Object, default: null },
  unit: { type: String, required: true }
});

defineEmits(['toggle-unit']);

const formattedArea = computed(() => {
  if (!props.space) {
    return '';
  }

  const squareMeters = props.space.w * props.space.d;
  const value = props.unit === 'ft2' ? squareMeters * 10.7639 : squareMeters;
  return `${value.toFixed(1)} ${props.unit === 'ft2' ? 'ft²' : 'm²'}`;
});
</script>

<template>
  <aside class="space-info-panel" aria-live="polite">
    <template v-if="space">
      <div>
        <p class="eyebrow">Selected space</p>
        <h3>{{ space.name }}</h3>
      </div>
      <dl>
        <div><dt>Use</dt><dd>{{ space.use }}</dd></div>
        <div><dt>Level</dt><dd>{{ space.level }}</dd></div>
        <div><dt>Area</dt><dd>{{ formattedArea }}</dd></div>
      </dl>
    </template>
    <p v-else>Select a room in the 3D view to inspect it.</p>
    <button class="secondary-button unit-button" type="button" @click="$emit('toggle-unit')">
      Show {{ unit === 'm2' ? 'ft²' : 'm²' }}
    </button>
  </aside>
</template>
