describe('IndexedDB Test Page', () => {
  it('should load the page and save text', () => {
    // Visit the indexed-db test page
    cy.visit('/q/indexed-db%20test')
    
    // Wait for the page to load properly
    cy.wait(2000)
    
    // Clear all text in the editor first
    cy.get('.ProseMirror').first().clear({ force: true })
    
    // Target the TipTap editor content area and type (using TipTap's approach)
    cy.get('.ProseMirror').first().type('does this save', { force: true })
    
    // Wait for autosave to complete
    cy.wait(1000)
    
    // Refresh the page to test IndexedDB persistence
    cy.reload()
    
    // Wait for the page to load after refresh
    cy.wait(2000)
    
    // Check if the typed text is still present after refresh
    cy.contains('does this save').should('exist')
  })
})