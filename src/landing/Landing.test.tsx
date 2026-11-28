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

  it('explains the three steps and the limitation honestly', () => {
    expect(html).toContain('How it works')
    expect(html).toContain('six schemes')
    expect(html).toContain('guidance, not an application')
    expect(html).toContain('not an official government')
  })

  it('shows every scheme in the dataset without inventing eligibility', () => {
    const cards = html.match(/class="lp-scheme"/g) ?? []
    expect(cards.length).toBe(6)
    expect(html).toContain('Eligibility is only decided after your answers')
    expect(html).not.toContain('You qualify')
  })

  it('offers language switches only for the supported languages', () => {
    expect(html).toContain('हिन्दी')
    expect(html).toContain('తెలుగు')
    expect(html).toContain('Hinglish')
  })

  it('keeps accessible structure: skip link, main landmark and labelled nav', () => {
    expect(html).toContain('Skip to main content')
    expect(html).toContain('<main id="main"')
    expect(html).toContain('aria-label="Main"')
  })
})
