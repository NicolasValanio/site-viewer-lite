const projectRepository = require('../repositories/project-repository');

function canAccessProject(user, project) {
  return user.role === 'staff' || (user.role === 'client' && project.account === user.account);
}

async function getAuthorizedProject(id, user) {
  const project = await projectRepository.findById(id);

  return project && canAccessProject(user, project) ? project : null;
}

async function listAuthorizedProjects(user) {
  const projects = await projectRepository.list();
  return projects.filter((project) => canAccessProject(user, project));
}

module.exports = { getAuthorizedProject, listAuthorizedProjects };
