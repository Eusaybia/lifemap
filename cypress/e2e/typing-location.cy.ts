describe('typing location detection', () => {
  const editorSelector = '[data-testid="typing-location-editor"]'

  it('wraps newly typed locations without backfilling existing text', () => {
    cy.visit('/cypress-typing-location')

    cy.get('[data-testid="typing-location-harness"]').should('be.visible')
    cy.get(`${editorSelector} [data-type="location"]`).should('have.length', 0)

    cy.get(`${editorSelector} .ProseMirror p`)
      .eq(0)
      .should('contain.text', 'Existing Sydney stays plain text.')
      .find('[data-type="location"]')
      .should('not.exist')

    cy.get('[data-testid="focus-basic-location-input"]').click()
    cy.focused().type('Sydney', { delay: 0 })

    cy.get(`${editorSelector} [data-type="location"]`, { timeout: 10000 })
      .should('have.length', 1)
      .first()
      .should('contain.text', '📍 Sydney')

    cy.get(`${editorSelector} .ProseMirror p`)
      .eq(0)
      .should('contain.text', 'Existing Sydney stays plain text.')
      .find('[data-type="location"]')
      .should('not.exist')
  })

  it('merges multi-word locations into a single location node', () => {
    cy.visit('/cypress-typing-location')

    cy.get('[data-testid="focus-multiword-location-input"]').click()
    cy.focused().type('Sydney Airport', { delay: 0 })

    cy.get(`${editorSelector} [data-type="location"]`, { timeout: 10000 })
      .should('have.length', 1)
      .first()
      .should('contain.text', '📍 Sydney Airport')
  })
})
