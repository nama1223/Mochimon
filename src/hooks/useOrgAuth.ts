import { useState } from 'react';
import { STORAGE_KEY } from '../config';
import type { OrgInfo } from '../types';

function load(): OrgInfo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as OrgInfo[];
  } catch {
    return [];
  }
}

function save(orgs: OrgInfo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}

export function useOrgAuth() {
  const [storedOrgs, setStoredOrgs] = useState<OrgInfo[]>(load);

  function storeOrg(org: OrgInfo) {
    setStoredOrgs(prev => {
      const next = prev.filter(o => o.id !== org.id);
      next.unshift(org);
      save(next);
      return next;
    });
  }

  function removeOrg(orgId: string) {
    setStoredOrgs(prev => {
      const next = prev.filter(o => o.id !== orgId);
      save(next);
      return next;
    });
  }

  return { storedOrgs, storeOrg, removeOrg };
}
