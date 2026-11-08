<script setup>
defineProps({
  levels: { type: Array, required: true },
  modelValue: { type: String, required: true }
});

defineEmits(['update:modelValue']);
</script>

<template>
  <label class="field-label level-filter" for="level-filter">
    Level
    <select
      id="level-filter"
      :value="modelValue"
      aria-label="Filter visible spaces by level"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="all">All levels</option>
      <option v-for="level in levels" :key="level" :value="level">{{ level }}</option>
    </select>
  </label>
</template>
