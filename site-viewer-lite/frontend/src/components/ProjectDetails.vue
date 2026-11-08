<script setup>
defineProps({
  project: { type: Object, required: true }
});

function showDate(value) {
  return value || 'Not recorded';
}
</script>

<template>
  <section class="card project-details" aria-labelledby="project-heading">
    <p class="eyebrow">Project overview</p>
    <h2 id="project-heading">{{ project.name }}</h2>
    <p class="address">{{ project.address }}</p>

    <dl class="details-grid">
      <div>
        <dt>Client</dt>
        <dd>{{ project.client.name }}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{{ project.status }}</dd>
      </div>
      <div>
        <dt>Signed</dt>
        <dd>{{ showDate(project.dates.signed) }}</dd>
      </div>
      <div>
        <dt>Scan</dt>
        <dd>{{ showDate(project.dates.scan) }}</dd>
      </div>
      <div>
        <dt>Estimated delivery</dt>
        <dd>{{ showDate(project.dates.estimatedDelivery) }}</dd>
      </div>
      <div>
        <dt>Delivered</dt>
        <dd>{{ showDate(project.dates.delivered) }}</dd>
      </div>
    </dl>

    <div v-if="project.client.contacts.length" class="contacts">
      <h3>Contacts</h3>
      <ul>
        <li v-for="contact in project.client.contacts" :key="`${contact.role}-${contact.name}`">
          <strong>{{ contact.name }}</strong> · {{ contact.role }}
          <span v-if="contact.email"> · {{ contact.email }}</span>
          <span v-if="contact.phone"> · {{ contact.phone }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
