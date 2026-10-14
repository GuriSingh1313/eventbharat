// Cheap keyword pre-filter so only plausible jobs reach the LLM.
export function prefilter(job, prefs) {
  const title = job.title.toLowerCase();
  const text = `${title} ${job.description}`.toLowerCase();
  const loc = job.location.toLowerCase();
  if (prefs.excludeKeywords.some((k) => title.includes(k.toLowerCase()))) return false;
  if (!prefs.keywords.some((k) => text.includes(k.toLowerCase()))) return false;
  if (loc && !prefs.locations.some((l) => loc.includes(l.toLowerCase()))) return false;
  return true;
}
