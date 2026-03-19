describe("image upload placeholder", () => {
  it("shows the uploading overlay while the image request is in flight", () => {
    cy.intercept("POST", "/api/upload*", (req) => {
      req.reply({
        delay: 1500,
        statusCode: 200,
        body: {
          url: "https://example.com/cypress-uploaded-image.png",
        },
      });
    }).as("imageUpload");

    cy.visit("/cypress-image-upload");
    cy.contains("Add image").should("be.visible").click({ force: true });

    cy.get('[data-testid="image-upload-input"]').selectFile(
      "cypress/fixtures/upload-image.png",
      { force: true },
    );

    cy.contains("Uploading image...").should("be.visible");
    cy.wait("@imageUpload");
    cy.contains("Uploading image...").should("not.exist");
    cy.get('img[src="https://example.com/cypress-uploaded-image.png"]').should(
      "exist",
    );
  });
});
