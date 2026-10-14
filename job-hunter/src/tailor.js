// Uses Claude to (1) score fit and (2) rewrite the resume + cover letter for one JD.
// Hard rule: never invent experience, employers, dates, metrics or skills.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.JOB_HUNTER_MODEL ?? 'claude-sonnet-5-5';
const client = new Anthropic();

const SYSTEM = `You are an expert technical recruiter and resume writer for the Indian job market.
You tailor a candidate's resume to a specific job description to pass ATS keyword screens and impress a hiring manager.
STRICT RULES:
- Use ONLY facts present in the candidate's base resume. Never invent employers, titles, dates, degrees, metrics, tools or skills.
- You MAY reorder, rephrase, emphasise, drop irrelevant bullets, and mirror the JD's wording for skills the candidate genuinely has.
- Keep it to one page worth of content.
- Respond with a single JSON object and nothing else.`;

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Model did not return JSON');
  return JSON.parse(m[0]);
}

export async function tailor(profile, job) {
  const { preferences, ...resume } = profile;
  const prompt = `BASE RESUME (JSON):
${JSON.stringify(resume, null, 2)}

JOB:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location}
Description:
${job.description.slice(0, 12000)}

Return JSON with exactly these keys:
{
  "score": 0-100 fit score (be honest; skills/experience gaps lower it),
  "reason": "one line why",
  "missingSkills": ["JD requirements the candidate lacks"],
  "resume": { same shape as BASE RESUME, tailored: rewrite "summary", reorder/rephrase "skills" and bullets },
  "coverLetter": "120-180 word cover letter addressed to the ${job.company} hiring team",
  "answers": { "whyThisCompany": "2-3 sentences", "noticePeriod": "${preferences.noticePeriodDays} days", "expectedCtc": "${preferences.expectedCtcLpa} LPA", "totalExperience": "${preferences.experienceYears} years" }
}`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const out = parseJson(text);
  out.resume = { ...out.resume, name: resume.name, email: resume.email, phone: resume.phone, links: resume.links };
  return out;
}
