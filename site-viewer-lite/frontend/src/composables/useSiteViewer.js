import { computed, ref } from 'vue';
import { createIssue, getProject, getProjects, getSpaces, isAbortError } from '../services/api';

export const viewerProfiles = [
  { id: 'staff', label: 'Staff', token: 'staff-token' },
  { id: 'acme', label: 'Acme client', token: 'acme-token' },
  { id: 'brick', label: 'Brick client', token: 'brick-token' }
];

export function useSiteViewer() {
  const profileId = ref('staff');
  const projects = ref([]);
  const selectedProjectId = ref('');
  const project = ref(null);
  const spaces = ref([]);
  const isLoadingProjects = ref(false);
  const isLoadingProject = ref(false);
  const isSubmittingIssue = ref(false);
  const error = ref(null);
  const issueSuccessId = ref('');

  let projectsController = null;
  let projectController = null;
  let issueController = null;
  let retryAction = null;

  const token = computed(() => viewerProfiles.find((profile) => profile.id === profileId.value)?.token);

  function abortRequest(controller) {
    controller?.abort();
  }

  function clearProject() {
    selectedProjectId.value = '';
    project.value = null;
    spaces.value = [];
    issueSuccessId.value = '';
  }

  function showError(message, retry) {
    error.value = message;
    retryAction = retry;
  }

  function clearError() {
    error.value = null;
    retryAction = null;
  }

  async function retry() {
    const action = retryAction;
    clearError();

    if (action) {
      await action();
    }
  }

  async function loadProjects() {
    abortRequest(projectsController);
    abortRequest(projectController);
    abortRequest(issueController);
    clearProject();
    clearError();

    const controller = new AbortController();
    projectsController = controller;
    isLoadingProjects.value = true;
    projects.value = [];

    try {
      const response = await getProjects(token.value, controller.signal);

      if (projectsController === controller) {
        projects.value = response.projects;
      }
    } catch (requestError) {
      if (projectsController === controller && !isAbortError(requestError)) {
        showError(requestError.message, loadProjects);
      }
    } finally {
      if (projectsController === controller) {
        isLoadingProjects.value = false;
      }
    }
  }

  async function selectProfile(nextProfileId) {
    profileId.value = nextProfileId;
    await loadProjects();
  }

  async function loadProject(id = selectedProjectId.value) {
    abortRequest(projectController);
    abortRequest(issueController);
    clearError();
    issueSuccessId.value = '';
    project.value = null;
    spaces.value = [];
    selectedProjectId.value = id;

    if (!id) {
      return;
    }

    const controller = new AbortController();
    projectController = controller;
    isLoadingProject.value = true;

    try {
      const [projectResponse, spacesResponse] = await Promise.all([
        getProject(id, token.value, controller.signal),
        getSpaces(id, token.value, controller.signal)
      ]);

      if (projectController === controller) {
        project.value = projectResponse.project;
        spaces.value = spacesResponse.spaces;
      }
    } catch (requestError) {
      if (projectController === controller && !isAbortError(requestError)) {
        showError(requestError.message, () => loadProject(id));
      }
    } finally {
      if (projectController === controller) {
        isLoadingProject.value = false;
      }
    }
  }

  async function submitIssue(issue) {
    if (!selectedProjectId.value) {
      return;
    }

    abortRequest(issueController);
    clearError();
    issueSuccessId.value = '';

    const controller = new AbortController();
    issueController = controller;
    isSubmittingIssue.value = true;

    try {
      const response = await createIssue(selectedProjectId.value, issue, token.value, controller.signal);

      if (issueController === controller) {
        issueSuccessId.value = response.id;
      }
    } catch (requestError) {
      if (issueController === controller && !isAbortError(requestError)) {
        showError(requestError.message, () => submitIssue(issue));
      }
    } finally {
      if (issueController === controller) {
        isSubmittingIssue.value = false;
      }
    }
  }

  return {
    error,
    isLoadingProject,
    isLoadingProjects,
    isSubmittingIssue,
    issueSuccessId,
    loadProjects,
    loadProject,
    profileId,
    project,
    projects,
    retry,
    selectProfile,
    selectedProjectId,
    spaces,
    submitIssue
  };
}
