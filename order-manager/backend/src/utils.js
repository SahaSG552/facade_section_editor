// ponytail: shared mappers extracted from auth.js and users.js to eliminate duplication

export function asLifecycle(status) {
  return status === 'profile_submitted' || status === 'registered' ? 'review' : status;
}

export function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    userStatus: asLifecycle(row.user_status),
    reviewNote: row.review_note,
    profileSubmittedAt: row.profile_submitted_at,
    reviewedAt: row.reviewed_at,
    company: row.company_id ? {
      id: row.company_id,
      name: row.company_name,
      status: row.company_status,
    } : null,
    profile: {
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      positionTitle: row.position_title || '',
      avatarUrl: row.avatar_url || null,
    },
    isActive: row.is_active,
    isBlocked: row.is_blocked,
    blockReason: row.block_reason,
    blockedAt: row.blocked_at,
    deletedAt: row.deleted_at,
    role: row.role_id ? {
      id: row.role_id,
      code: row.role_code,
      name: row.role_name,
      menus: row.menus,
      panels: row.panels,
      permissions: row.permissions,
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCompany(row) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    website: row.website,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    socialLinks: row.social_links || {},
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
