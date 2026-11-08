export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

async function apiRequest(path, { body, method = 'GET', signal, token } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError('Unable to reach the server. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || 'The request could not be completed.', response.status);
  }

  return payload;
}

export function getProjects(token, signal) {
  return apiRequest('/api/projects', { token, signal });
}

export function getProject(id, token, signal) {
  return apiRequest(`/api/projects/${encodeURIComponent(id)}`, { token, signal });
}

export function getSpaces(id, token, signal) {
  return apiRequest(`/api/projects/${encodeURIComponent(id)}/spaces`, { token, signal });
}

export function createIssue(id, issue, token, signal) {
  return apiRequest(`/api/projects/${encodeURIComponent(id)}/issues`, {
    body: issue,
    method: 'POST',
    signal,
    token
  });
}
