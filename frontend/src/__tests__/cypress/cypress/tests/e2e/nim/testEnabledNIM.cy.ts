import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';

describe('Verify RHODS Explore Section Contains NIM card and verify card body', () => {

  it('Validate that Nvidia NIM card is displayed in the Explore Section', () => {
    // Authentication and navigation
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Navigate to the Explore page and search for each ISV
    cy.step('Navigate to the Explore page');
    explorePage.visit();
    cy.findByTestId('card nvidia-nim').contains('NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.')
  });
});
