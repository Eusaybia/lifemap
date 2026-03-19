describe("group flow menu actions", () => {
  it("renders a visible text label for every action option while scrolling", () => {
    cy.visit("/cypress-flow-menu");

    cy.contains("Group Flow Menu Harness").should("be.visible");
    cy.get('[data-node-overlay="true"][data-node-type="group"] .node-overlay-grip-handle')
      .first()
      .trigger("mousedown", { button: 0, force: true });

    cy.get('[data-testid="node-actions"]').should("be.visible").as("actionSwitch");
    cy.get('@actionSwitch')
      .find('[data-flow-switch-option]')
      .should(($options) => {
        expect($options.length).to.be.greaterThan(5);
      })
      .each(($option) => {
        cy.wrap($option).then(($el) => {
          ($el[0] as HTMLElement).scrollIntoView({
            block: "center",
            inline: "nearest",
          });
        });
        cy.wait(50);

        cy.wrap($option)
          .invoke("text")
          .then((text) => {
            expect(text.trim(), `label for ${$option.attr("data-flow-switch-option")}`).to.not.equal("");
          });

        cy.get("@actionSwitch").then(($switch) => {
          const containerRect = ($switch[0] as HTMLElement).getBoundingClientRect();
          const optionRect = ($option[0] as HTMLElement).getBoundingClientRect();
          const visibleHeight =
            Math.min(optionRect.bottom, containerRect.bottom) -
            Math.max(optionRect.top, containerRect.top);

          expect(
            visibleHeight,
            `visible height for ${$option.attr("data-flow-switch-option")}`,
          ).to.be.greaterThan(0);
        });
      });

    cy.get('[data-testid="node-actions"] [data-flow-switch-option="Insert 2 columns"]')
      .should("exist")
      .and("contain.text", "Insert 2 columns");

    cy.get('[data-testid="node-actions"] [data-flow-switch-option="Insert 3 columns"]')
      .should("exist")
      .and("contain.text", "Insert 3 columns");
  });
});
