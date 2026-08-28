export function formatMemberName(member: {
  firstName: string
  middleName?: string | null
  lastName: string
}): string {
  return [member.firstName, member.middleName?.trim(), member.lastName]
    .filter(Boolean)
    .join(' ')
}
