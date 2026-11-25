// Role-based access control. Roles are per workspace.
export const ROLES = ["owner", "admin", "auditor", "viewer"];

export const ROLE_META = {
  owner: { label: "Owner", description: "Full control, including workspace deletion and ownership." },
  admin: { label: "Admin", description: "Manage members, sites, settings and all audits." },
  auditor: { label: "Auditor", description: "Add sites, run audits and decide on findings." },
  viewer: { label: "Viewer", description: "Read-only access to dashboards, findings and reports." },
};

export const PERMISSIONS = {
  "site:read": ["owner", "admin", "auditor", "viewer"],
  "site:create": ["owner", "admin", "auditor"],
  "site:delete": ["owner", "admin"],
  "audit:run": ["owner", "admin", "auditor"],
  "finding:decide": ["owner", "admin", "auditor"],
  "alert:manage": ["owner", "admin", "auditor"],
  "report:export": ["owner", "admin", "auditor", "viewer"],
  "member:read": ["owner", "admin", "auditor", "viewer"],
  "member:manage": ["owner", "admin"],
  "settings:manage": ["owner", "admin"],
  "activity:read": ["owner", "admin"],
  "workspace:delete": ["owner"],
};

export const can = (role, perm) => !!PERMISSIONS[perm]?.includes(role);

export const permissionsFor = (role) =>
  Object.keys(PERMISSIONS).filter((p) => can(role, p));

// Admins can't promote to / modify owners.
export const canAssign = (actorRole, targetRole) =>
  actorRole === "owner" || (actorRole === "admin" && targetRole !== "owner");
