// Run: npm test
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kitSections } from './kit.js'

test('every kit text fits the platform limit and uses the real links', () => {
  const sections = kitSections('Guri Singh', 'https://example.app')
  for (const sec of sections) {
    for (const it of sec.items) {
      if (it.max) assert.ok(it.text.length <= it.max, `${sec.title} / ${it.label}: ${it.text.length} > ${it.max}`)
    }
  }
  const all = JSON.stringify(sections)
  assert.match(all, /https:\/\/example\.app\/work\//)
  assert.match(all, /https:\/\/example\.app\/dukaan\/\?shop=sharma-dhaba/)
  assert.match(all, /\\n\\nGuri"/) // proposal is signed with the first name
  assert.doesNotMatch(all, /years of experience|\d+\+ clients/i)
})
