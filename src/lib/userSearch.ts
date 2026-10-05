import { usersApi } from '@/api/users';
import type { ComboboxOption } from '@/components/SearchCombobox';

export async function searchUserOptions(term: string): Promise<ComboboxOption[]> {
  const list = await usersApi.search(term);
  return list.map((u) => ({ id: u.id, label: u.userName, hint: u.displayName }));
}