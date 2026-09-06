import { api } from '../api/client';

// Background resume processing finishes seconds after registration returns.
// Poll briefly so the learner gets a completion toast once skills land;
// silent on timeout (skills simply appear on next fetch).
export const PARSE_POLL_ATTEMPTS = 10;
export const PARSE_POLL_INTERVAL_MS = 3000;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export async function pollForParsedSkills(showToast) {
  for (let attempt = 0; attempt < PARSE_POLL_ATTEMPTS; attempt += 1) {
    await sleep(PARSE_POLL_INTERVAL_MS);
    try {
      const skills = await api.get('/skills');
      if (Array.isArray(skills) && skills.length > 0) {
        showToast(`Resume parsed: ${skills.length} skill${skills.length === 1 ? '' : 's'} ready — verify them in Assessments`, 'success');
        return;
      }
    } catch {
      return;
    }
  }
}
