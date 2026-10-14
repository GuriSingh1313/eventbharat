# job-hunter

Finds jobs on Naukri and company career pages, rewrites your resume for each job description using Claude, and applies.

```
discover ──► filter ──► tailor (Claude) ──► PDF ──► apply ──► tracker
Naukri       keywords   score + resume      per     form fill  data/jobs.json
Greenhouse   location   + cover letter      job     / Naukri
Lever/Ashby  exclusions                             Apply
```

## Setup
```bash
cd job-hunter
npm install && npx playwright install chromium
cp config/profile.example.json config/profile.json      # your full base resume + preferences
cp config/companies.example.json config/companies.json  # companies & Naukri searches
export ANTHROPIC_API_KEY=sk-ant-...
npm run login:naukri        # one time: log in (OTP) in the window, then close it
```

## Daily use
```bash
npm run discover            # pull new jobs into data/jobs.json
npm run tailor              # score each one, write a tailored resume PDF + cover letter
npm run apply               # opens each form already filled in; you check it and click Submit
npm run apply -- --auto-submit   # fully automatic; anything with unanswered questions is marked "manual"
npm run status              # applied / manual / pending list with links
npm run run                 # discover + tailor + apply + status
```

Output for each job goes to `data/applications/<company>_<title>/`: `tailored.json`, `cover-letter.txt`, `<Name>_Resume.pdf`.

## Adding companies
Most career pages run on an ATS. Open the company's careers page and check the URL:
- `boards.greenhouse.io/<slug>` or `job-boards.greenhouse.io/<slug>` → add to `greenhouse`
- `jobs.lever.co/<slug>` → `lever`
- `jobs.ashbyhq.com/<slug>` → `ashby`

Workday and custom portals are not supported yet. Use Naukri or apply to those by hand with the tailored PDF.

## Notes
- **No made-up content:** the prompt only lets Claude reorder, rephrase and emphasise what is already in `profile.json`. Read the PDF before an important application.
- **Naukri** applies with the resume on your Naukri profile, not the tailored PDF. Recruiter questionnaires are marked `manual`. Automating Naukri may go against its terms and can get your account flagged, so keep `maxApplicationsPerRun` low. Review mode (the default) is the safer choice.
- Model: `claude-sonnet-5-5` by default. Change it with `JOB_HUNTER_MODEL`.
- `config/profile.json`, `config/companies.json`, `.auth/` and `data/` are gitignored, so your personal data never gets committed.
