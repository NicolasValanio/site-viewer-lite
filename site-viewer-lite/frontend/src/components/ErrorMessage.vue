<script setup>
defineProps({
  message: { type: String, required: true }
});

defineEmits(['retry']);
</script>

<template>
  <section class="error-message" role="alert">
    <div>
      <strong>Something went wrong</strong>
      <p>{{ message }}</p>
    </div>
    <button class="secondary-button" type="button" @click="$emit('retry')">Try again</button>
  </section>
</template>
