<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  project: { type: Object, required: true },
  spaces: { type: Array, required: true },
  submitting: Boolean
});

const emit = defineEmits(['submit']);
const title = ref('');
const level = ref('');
const spaceId = ref('');
const spacesForLevel = computed(() => props.spaces.filter((space) => space.level === level.value));

watch(
  () => props.project.id,
  () => {
    title.value = '';
    level.value = props.project.levels[0] || '';
    spaceId.value = '';
  },
  { immediate: true }
);

watch(level, () => {
  if (!spacesForLevel.value.some((space) => space.id === spaceId.value)) {
    spaceId.value = '';
  }
});

function submit() {
  emit('submit', {
    title: title.value.trim(),
    level: level.value,
    ...(spaceId.value ? { spaceId: spaceId.value } : {})
  });
}
</script>

<template>
  <section class="card issue-form" aria-labelledby="issue-heading">
    <p class="eyebrow">Support</p>
    <h2 id="issue-heading">Report an issue</h2>
    <form @submit.prevent="submit">
      <label class="field-label" for="issue-title">
        Title
        <input id="issue-title" v-model="title" maxlength="120" required placeholder="Describe the problem" />
      </label>

      <label class="field-label" for="issue-level">
        Level
        <select id="issue-level" v-model="level" required>
          <option v-for="item in project.levels" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>

      <label class="field-label" for="issue-space">
        Space <span class="optional">Optional</span>
        <select id="issue-space" v-model="spaceId">
          <option value="">No space selected</option>
          <option v-for="space in spacesForLevel" :key="space.id" :value="space.id">
            {{ space.name }}
          </option>
        </select>
      </label>

      <button class="primary-button" :disabled="submitting" type="submit">
        {{ submitting ? 'Submitting…' : 'Submit report' }}
      </button>
    </form>
  </section>
</template>
