import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';

describe('Verify RHODS Explore Section Contains NIM card and verify card body', () => {
  it('Enable and validate NIM flow', () => {
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Navigate to the Explore page and search for each ISV
    cy.step('Navigate to the Explore page');
    explorePage.visit();
    cy.findByTestId('card nvidia-nim').contains(
      'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
    );
    cy.findByTestId('card nvidia-nim').click();
    cy.get('button:contains("Enable")').click();
    cy.get('[data-id="NVIDIA AI Enterprise license key"]').type(Cypress.env('NGC_API_KEY'));
    cy.get('button:contains("Submit")').click();
    // Add wait validation logic here
    cy.get('.odh-enable-modal__progress-title').should('exist');
    cy.get('.odh-enable-modal__progress-title', { timeout: 120000 }).should('not.exist');
    enabledPage.visit();
    cy.findByTestId('card nvidia-nim').contains(
      'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
    );
    cy.findByTestId('card nvidia-nim').within(() => {
      cy.contains('button', 'Disabled', { timeout: 60000 }).should('not.exist');
    });
  });
});
