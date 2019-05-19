const { expect } = require('chai')
const { requireFromEnvironment } = require('../lib/util')
describe('utils', () => {
  it('requires from the environment', () => {
    const empty = requireFromEnvironment('not_found', 'fallback')
    process.env.WOW = 'wow'
    const wow = requireFromEnvironment('WOW', 'failed')

    expect(empty).to.equal('fallback')
    expect(wow).to.equal('wow')
  })
})
