import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Landing from './Landing'

const html = renderToStaticMarkup(<Landing />)

describe('landing page', () => {
  it('states the product promise and the primary action', () => {
    expect(html).toContain('Government benefits shouldn')
    expect(html).toContain('Find schemes for me')
    expect(html).toContain('href="#/start"')
  })

  it('explains how it works and the limits honestly', () => {
    expect(html).toContain('How it works')
    expect(html).toContain('Seven schemes in this version')
    expect(html).toContain('Guidance, not a government decision')
    expect(html).toContain('not an official government service')
  })

  it('lists every scheme in the dataset without inventing eligibility', () => {
    const cards = html.match(/class="lp-scheme"/g) ?? []
    expect(cards.length).toBe(7)
    expect(html).toContain('Eligibility is only decided after your answers')
    expect(html).not.toContain('You qualify')
  })

  it('tags the Telangana scheme separately from the national ones', () => {
    expect(html).toContain('Telangana')
    expect(html).toContain('All India')
  })

  it('offers only the supported languages', () => {
    expect(html).toContain('हिन्दी')
    expect(html).toContain('తెలుగు')
    expect(html).toContain('Hinglish')
  })

  it('keeps accessible structure: skip link, main landmark, one h1', () => {
    expect(html).toContain('Skip to main content')
    expect(html).toContain('<main id="main"')
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
  })

  it('does not ship the long sections the redesign removed', () => {
    expect(html).not.toContain('Made to be usable')
    expect(html).not.toContain('Built around the person')
  })
})
