export type Invitation = { id: string; email: string; name: string };
export type InvitationResult = { id: string; email: string; status: 'sent' | 'error' | 'pending'; message?: string };

export const validateInvitations = (rows: Invitation[]) => {
  if (!rows.length || rows.length > 50) throw new Error('Pridajte 1 až 50 zamestnancov.');
  const emails = new Set<string>();
  return rows.map(row => {
    const email = row.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Skontrolujte email v každom riadku.');
    if (emails.has(email)) throw new Error(`Email ${email} je zadaný viackrát.`);
    emails.add(email);
    return { ...row, email, name: row.name.trim() };
  });
};

export const sendInvitationQueue = async (rows: Invitation[], options: {
  send: (row: Invitation) => Promise<void>;
  onProgress: (row: Invitation, index: number, result?: InvitationResult) => void;
  wait?: (ms: number) => Promise<void>;
}) => {
  const results: InvitationResult[] = [];
  const wait = options.wait || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    options.onProgress(row, index);
    let result: InvitationResult;
    try {
      await options.send(row);
      result = { id: row.id, email: row.email, status: 'sent' };
    } catch (error: any) {
      result = { id: row.id, email: row.email, status: 'error', message: error?.message || 'Pozvánku sa nepodarilo odoslať.' };
      if ([401, 403, 429].includes(error?.status)) {
        results.push(result);
        options.onProgress(row, index, result);
        for (const remaining of rows.slice(index + 1)) results.push({ id: remaining.id, email: remaining.email, status: 'pending', message: 'Zatiaľ neodoslané. Odosielanie bolo prerušené.' });
        return results;
      }
    }
    results.push(result);
    options.onProgress(row, index, result);
    if (index < rows.length - 1) await wait(1000);
  }
  return results;
};
