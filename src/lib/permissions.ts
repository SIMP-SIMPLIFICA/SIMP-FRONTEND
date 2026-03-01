import type { MeResponse } from "@/hooks/useMe";

export function getPermissions(me?: MeResponse | undefined): Set<string> {
  const list =
    me?.user?.roles?.flatMap((r) => r?.role?.permissions ?? []) ?? [];
  return new Set(list);
}

export function hasPermission(me: MeResponse | undefined, perm: string) {
  return getPermissions(me).has(perm);
}

export function hasAnyPermission(me: MeResponse | undefined, perms: string[]) {
  const set = getPermissions(me);
  return perms.some((p) => set.has(p));
}

export function hasAllPermissions(me: MeResponse | undefined, perms: string[]) {
  const set = getPermissions(me);
  return perms.every((p) => set.has(p));
}
