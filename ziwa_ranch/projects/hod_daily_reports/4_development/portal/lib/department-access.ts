import type { AuthContext } from './with-auth'

interface DepartmentIdentity {
  id: string
  slug: string
}

export function canAccessDepartment(
  actor: Pick<AuthContext, 'user' | 'guest'>,
  department: DepartmentIdentity
): boolean {
  if (actor.user) {
    return (
      actor.user.role === 'hod' &&
      actor.user.department_id === department.id &&
      actor.user.department_slug === department.slug
    )
  }

  if (actor.guest) {
    return actor.guest.slug === department.slug
  }

  return false
}
