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

    cy.get('[data-testid="browser-window-address-input"]')
      .clear()
      .type('bing{enter}')

    cy.get('[data-testid="browser-window-address-input"]')
      .should('have.value', 'https://www.google.com/search?q=bing')

    cy.get('[data-testid="browser-window-iframe"]')
      .should('have.attr', 'src')
      .and('include', 'https://www.google.com/search?q=bing')

    cy.get('[data-testid="browser-window-address-input"]')
      .clear()
      .type('Google Play Console{enter}')

    cy.get('[data-testid="browser-window-address-input"]')
      .should('have.value', 'https://www.google.com/search?q=Google%20Play%20Console')

    cy.get('[data-testid="browser-window-iframe"]')
      .should('have.attr', 'src')
      .and('include', 'https://www.google.com/search?q=Google%20Play%20Console')
  })
})
