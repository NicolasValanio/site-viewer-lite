function serializeContact(contact, user) {
  const serialized = {
    role: contact.role,
    name: contact.name
  };

  if (user.role === 'staff') {
    serialized.email = contact.email;
    serialized.phone = contact.phone;
  }

  return serialized;
}

function serializeProjectSummary(project) {
  return {
    id: project.id,
    name: project.name,
    address: project.address,
    status: project.status,
    clientName: project.client.name
  };
}

function serializeProjectDetail(project, user) {
  return {
    ...serializeProjectSummary(project),
    client: {
      name: project.client.name,
      contacts: project.client.contacts.map((contact) => serializeContact(contact, user))
    },
    dates: {
      signed: project.dates.signed,
      scan: project.dates.scan,
      estimatedDelivery: project.dates.estimatedDelivery,
      delivered: project.dates.delivered
    },
    levels: [...project.levels]
  };
}

module.exports = { serializeProjectDetail, serializeProjectSummary };
