
export type SitePermission = {
  id: string;
  site_id: string;
  user_id: string;
  can_manage_diary: boolean;
  can_manage_finance: boolean;
  sites?: {
    name: string;
    address: string;
  };
}

/**
 * Zistí, či má používateľ akékoľvek špeciálne poverenie.
 */
export const hasAnyPrivilege = (permissions: SitePermission[]) => {
  return permissions.length > 0;
}

/**
 * Vráti zoznam stavieb, kde môže zamestnanec spravovať denník.
 */
export const getDiarySites = (permissions: SitePermission[]) => {
  return permissions.filter(p => p.can_manage_diary);
}

/**
 * Vráti zoznam stavieb, kde môže zamestnanec spravovať financie.
 */
export const getFinanceSites = (permissions: SitePermission[]) => {
  return permissions.filter(p => p.can_manage_finance);
}
