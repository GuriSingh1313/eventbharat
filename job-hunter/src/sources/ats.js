// Company career pages on public ATS job-board APIs (no login, no scraping).
const stripHtml = (s = '') =>
  s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function greenhouse(slug) {
  const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  return data.jobs.map((j) => ({
    id: `gh:${slug}:${j.id}`,
    source: 'greenhouse',
    company: slug,
    title: j.title,
    location: j.location?.name ?? '',
    url: j.absolute_url,
    description: stripHtml(decodeEntities(j.content)),
    apply: { type: 'greenhouse', board: slug, jobId: j.id },
  }));
}

export async function lever(slug) {
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  return data.map((j) => ({
    id: `lv:${slug}:${j.id}`,
    source: 'lever',
    company: slug,
    title: j.text,
    location: j.categories?.location ?? '',
    url: j.hostedUrl,
    description: stripHtml(`${j.descriptionPlain ?? ''} ${(j.lists ?? []).map((l) => `${l.text} ${l.content}`).join(' ')}`),
    apply: { type: 'lever', url: j.applyUrl },
  }));
}

export async function ashby(slug) {
  const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  return data.jobs.map((j) => ({
    id: `ab:${slug}:${j.id}`,
    source: 'ashby',
    company: slug,
    title: j.title,
    location: j.location ?? '',
    url: j.jobUrl,
    description: stripHtml(j.descriptionHtml ?? j.descriptionPlain ?? ''),
    apply: { type: 'ashby', url: j.applyUrl ?? j.jobUrl },
  }));
}

function decodeEntities(s = '') {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
