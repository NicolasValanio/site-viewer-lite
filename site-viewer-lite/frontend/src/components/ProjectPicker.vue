<script setup>
defineProps({
  disabled: Boolean,
  loading: Boolean,
  modelValue: { type: String, required: true },
  projects: { type: Array, required: true }
});

defineEmits(['update:modelValue']);
</script>

<template>
  <label class="field-label" for="project-picker">
    Project
    <select
      id="project-picker"
      :disabled="disabled || loading"
      :value="modelValue"
      aria-label="Project"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ loading ? 'Loading projects…' : 'Select a project' }}</option>
      <option v-for="project in projects" :key="project.id" :value="project.id">
        {{ project.name }}
      </option>
    </select>
  </label>
</template>
