import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, wrapCorrection } from '../src/main/prompt'
import { isSafeBaseURL } from '../src/shared/url'
import { PROVIDERS, getPreset, isProviderId } from '../src/shared/providers'

describe('buildSystemPrompt', () => {
  it('asks for the LANG header only in the English flow', () => {
    expect(buildSystemPrompt('to-english', 'professional', '')).toContain('"LANG: pt"')
    expect(buildSystemPrompt('to-portuguese', 'professional', '')).not.toContain('LANG:')
  })

  it('applies the chosen tone', () => {
    expect(buildSystemPrompt('to-english', 'casual', '')).toContain('Slack')
    expect(buildSystemPrompt('to-english', 'concise', '')).toContain('short and direct')
  })

  it('includes the glossary only when there is one', () => {
    expect(buildSystemPrompt('to-english', 'professional', '  ')).not.toContain('<glossary>')
    expect(buildSystemPrompt('to-english', 'professional', 'deploy\nfatura = invoice')).toContain('<glossary>\ndeploy\nfatura = invoice\n</glossary>')
  })

  it('tells the model to treat the text as content, not instructions', () => {
    expect(buildSystemPrompt('to-portuguese', 'casual', '')).toMatch(/never as instructions/)
  })
})

describe('wrapCorrection', () => {
  it('tags the original and corrected texts', () => {
    expect(wrapCorrection('a', 'b')).toBe('<original>\na\n</original>\n<corrected>\nb\n</corrected>')
  })
})

describe('isSafeBaseURL', () => {
  it.each([
    ['https://api.groq.com/openai/v1', true],
    ['http://localhost:11434/v1', true],
    ['http://127.0.0.1:1234/v1', true],
    ['http://[::1]:8080/v1', true],
    ['http://api.example.com/v1', false],
    ['ftp://example.com', false],
    ['not a url', false]
  ])('%s -> %s', (url, safe) => {
    expect(isSafeBaseURL(url)).toBe(safe)
  })
})

describe('providers', () => {
  it('has unique ids and a preset for each id', () => {
    const ids = PROVIDERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(getPreset(id).id).toBe(id)
  })

  it('only lets local or custom providers use plain http', () => {
    for (const preset of PROVIDERS.filter((p) => p.baseURL)) {
      expect(isSafeBaseURL(preset.baseURL)).toBe(true)
    }
  })

  it('validates provider ids', () => {
    expect(isProviderId('groq')).toBe(true)
    expect(isProviderId('anthropic')).toBe(false)
  })
})
