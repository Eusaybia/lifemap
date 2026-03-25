describe('browser window node', () => {
  it('loads the URL entered into the address bar', () => {
    cy.visit('/cypress-browser-window')

    cy.get('[data-testid="browser-window-harness"]').should('be.visible')
    cy.get('[data-testid="browser-window-node"]', { timeout: 10000 }).should('be.visible')

    cy.get('[data-testid="browser-window-address-input"]')
      .should('have.value', 'https://kairoslifemap.com')
      .clear()
      .type('https://example.com{enter}')

    cy.get('[data-testid="browser-window-address-input"]')
      .should('have.value', 'https://example.com')

    cy.get('[data-testid="browser-window-iframe"]')
      .should('have.attr', 'src')
      .and('include', 'https://example.com')

    cy.get('[data-testid="browser-window-address-input"]')
      .clear()
      .type('google.com{enter}')

    cy.get('[data-testid="browser-window-address-input"]')
      .should('have.value', 'https://google.com')

    cy.get('[data-testid="browser-window-iframe"]')
      .should('have.attr', 'src')
      .and('include', 'https://google.com')
  })
})
