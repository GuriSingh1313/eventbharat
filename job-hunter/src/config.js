import fs from 'node:fs';

function read(name) {
  const file = `config/${name}.json`;
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}. Copy config/${name}.example.json to ${file} and fill it in.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const profile = () => read('profile');
export const companies = () => read('companies');
