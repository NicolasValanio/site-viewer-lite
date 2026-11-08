<script setup>
defineProps({
  modelValue: { type: String, required: true },
  profiles: { type: Array, required: true }
});

defineEmits(['update:modelValue']);
</script>

<template>
  <label class="field-label" for="viewer-profile">
    Viewing as
    <select
      id="viewer-profile"
      :value="modelValue"
      aria-label="Viewing as"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
        {{ profile.label }}
      </option>
    </select>
  </label>
</template>
