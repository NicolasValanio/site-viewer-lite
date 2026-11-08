<script setup>
import { onMounted, ref, watch } from 'vue';
import ErrorMessage from './components/ErrorMessage.vue';
import IssueForm from './components/IssueForm.vue';
import ProjectDetails from './components/ProjectDetails.vue';
import ProjectPicker from './components/ProjectPicker.vue';
import SpaceViewer from './components/SpaceViewer.vue';
import TokenPicker from './components/TokenPicker.vue';
import { usePointCloud } from './composables/usePointCloud';
import { useSiteViewer, viewerProfiles } from './composables/useSiteViewer';

const {
  error,
  isLoadingProject,
  isLoadingProjects,
  isSubmittingIssue,
  issueSuccessId,
  loadProject,
  loadProjects,
  profileId,
  project,
  projects,
  retry,
  selectProfile,
  selectedProjectId,
  spaces,
  token,
  submitIssue
} = useSiteViewer();

const {
  cancel: cancelPointCloud,
  error: pointCloudError,
  load: loadPointCloud,
  pointCloud,
  progress: pointCloudProgress,
  retry: retryPointCloud,
  state: pointCloudState
} = usePointCloud();

const selectedSpaceId = ref('');

watch(
  () => project.value?.id,
  () => {
    selectedSpaceId.value = '';
    cancelPointCloud();
  }
);

function requestPointCloud() {
  if (project.value && token.value) {
    loadPointCloud({ projectId: project.value.id, token: token.value });
  }
}

onMounted(loadProjects);
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Secure project access</p>
        <h1>Site Viewer Lite</h1>
      </div>
      <p class="header-note">Project data and issue reporting</p>
    </header>

    <section class="card controls" aria-label="Project controls">
      <TokenPicker :model-value="profileId" :profiles="viewerProfiles" @update:model-value="selectProfile" />
      <ProjectPicker
        :disabled="!projects.length"
        :loading="isLoadingProjects"
        :model-value="selectedProjectId"
        :projects="projects"
        @update:model-value="loadProject"
      />
    </section>

    <ErrorMessage v-if="error" :message="error" @retry="retry" />

    <p v-if="isLoadingProject" class="loading-message" role="status">Loading project details…</p>

    <section v-else-if="project" class="project-workspace">
      <div class="workspace">
        <ProjectDetails :project="project" />
        <div class="side-column">
          <IssueForm
            :project="project"
            :selected-space-id="selectedSpaceId"
            :spaces="spaces"
            :submitting="isSubmittingIssue"
            @submit="submitIssue"
            @update:selected-space-id="selectedSpaceId = $event"
          />
          <p v-if="issueSuccessId" class="success-message" role="status">
            Issue report created: <code>{{ issueSuccessId }}</code>
          </p>
        </div>
      </div>
      <SpaceViewer
        :cloud-error="pointCloudError"
        :cloud-progress="pointCloudProgress"
        :cloud-state="pointCloudState"
        :point-cloud="pointCloud"
        :project="project"
        :selected-space-id="selectedSpaceId"
        :spaces="spaces"
        @cancel-cloud="cancelPointCloud"
        @load-cloud="requestPointCloud"
        @retry-cloud="retryPointCloud"
        @update:selected-space-id="selectedSpaceId = $event"
      />
    </section>

    <section v-else class="empty-state">
      <h2>Select a project</h2>
      <p>Choose a user and project to review its details and report an issue.</p>
    </section>
  </main>
</template>
