import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  projectListPage,
  createProjectModal,
  projectDetails,
  projectDetailsOverviewTab,
} from '~/__tests__/cypress/cypress/pages/projects';
import type { CommandLineResult, DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { nimDeployModal } from '../../../pages/components/NIMDeployModal';
import { deleteNIMAccount, writePodLogToFile, writeResourceToFile } from '../../../utils/oc_commands/baseCommands';

let models = [
  "rfdiffusion-latest"
]

const waitForPod = (namespace: string, podPrefix: string): Cypress.Chainable<string> => {
  cy.log(`oc get pods -n ${namespace} --no-headers | grep ${podPrefix} || true`)
  return cy
    .exec(`oc get pods -n ${namespace} --no-headers | grep ${podPrefix} || true`)
    .then((result: Cypress.Exec) => {
      const podLine: string = result.stdout.trim()
      if (podLine) {
        const columns = podLine.split(/\s+/)
        const podName = columns[0]
        const status = columns[2]
        if (status === 'Running') {
          return cy.wrap(podName)
        } else {
          cy.wait(1000)
          return waitForPod(namespace, podPrefix)
        }
      } else {
        cy.wait(1000)
        return waitForPod(namespace, podPrefix)
      }
    })
}


for (let i = 0; i < models.length; i++) {
  // for (let i = 0; i < 5; i++) {
  describe.skipppppppppppppppppppppppppppppppp(`Deploying ${models[i]}`, { tags: ['@NIM'] }, () => {
    let testData: DataScienceProjectData;
    let randomNumber: Number;

    beforeEach(() => {
      const randomNum = () => Cypress._.random(0, 1e3);
      randomNumber = Number(randomNum());
    })
    before(() => {
      // cy.step('Delete odh-nim-account');
      // deleteNIMAccount(Cypress.env('TEST_NAMESPACE'), true);
      // Load test data
      return cy.fixture('e2e/nim/testDeploySingleNIM.yaml', 'utf8').then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DataScienceProjectData;
      });
    });


    afterEach(() => {
      let namespace = `${testData.projectDisplayName}-${randomNumber}`
      cy.get('@podName').then((podName) => {
        cy.exec(`oc get Account odh-nim-account -n redhat-ods-applications -o yaml > cypress/fixtures/${podName}/Account-${podName}`, { failOnNonZeroExit: false })
        cy.exec(`oc get InferenceService -n ${namespace} -o yaml > cypress/fixtures/${podName}/InferenceService-${podName}`, { failOnNonZeroExit: false })
        cy.exec(`oc get ServingRuntime -n ${namespace} -o yaml > cypress/fixtures/${podName}/ServingRumtime-${podName}`, { failOnNonZeroExit: false })
        cy.readFile(`cypress/fixtures/${podName}/${podName}.log`).should('exist')
      })
      cy.step('Delete test project');
      deleteOpenShiftProject(
        `${testData.projectDisplayName}-${randomNumber}`,
        { timeout: 450000 },
        true,
      ); // Takes very long time to delete the project
    });

    // // after(() => {
    //   writePodLogToFile(
    //     `serving.kserve.io/inferenceservice=${models[i]}`,
    //     `${testData.projectDisplayName}-${randomNumber}`,
    //     models[i],
    //   );
    //   writeResourceToFile(
    //     'inferenceservice',
    //     models[i],
    //     `${testData.projectDisplayName}-${randomNumber}`,
    //     models[i],
    //   );
    //   deleteOpenShiftProject(`${testData.projectDisplayName}-${randomNumber}`);
    // });

    it(`Deploy ${models[i]} NIM and verify deployment`, () => {
      // Authentication and navigation
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to the Explore page and search for each ISV
      cy.step('Navigate to the DataScience Project page');
      projectListPage.visit();
      createProjectModal.shouldBeOpen(false);
      projectListPage.findCreateProjectButton().click();
      cy.step('Enter valid project information');
      createProjectModal.k8sNameDescription
        .findDisplayNameInput()
        .type(`${testData.projectDisplayName}-${randomNumber}`);
      createProjectModal.k8sNameDescription
        .findDescriptionInput()
        .type(`${testData.projectDescription}-${randomNumber}`);
      // Submit project creation
      cy.step('Save the project');
      createProjectModal.findSubmitButton().click();

      // Verify project creation
      cy.step(
        `Verify that the project ${testData.projectDisplayName}-${randomNumber} has been created`,
      );
      cy.url().should('include', `/projects/${testData.projectResourceName}-${randomNumber}`);
      projectDetails.verifyProjectName(`${testData.projectDisplayName}-${randomNumber}`);
      projectDetails.verifyProjectDescription(`${testData.projectDescription}-${randomNumber}`);
      projectDetailsOverviewTab
        .findModelServingPlatform('nvidia-nim')
        .findByTestId('nim-serving-select-button')
        .should('be.enabled')
        .click();
      cy.findByTestId('model-serving-platform-button').click();
      nimDeployModal.findModelNameInput().type(models[i]);
      nimDeployModal.selectNIMToDeploy(models[i]);
      nimDeployModal.findNimStorageSizeInput().type('{selectall}100');
      nimDeployModal.findModelServerSizeSelect().findSelectOption(/Large/).click();
      nimDeployModal.selectAccelerator('NVIDIA GPU');
      nimDeployModal.findSubmitButton().click();

      let namespace = `${testData.projectDisplayName}-${randomNumber}`
      waitForPod(namespace, models[i].split('-')[0]).then((podName: string) => {
        cy.log(`Pod found ${podName}`)
        cy.exec(`mkdir -p cypress/fixtures/${podName}`)
        cy.exec(`bash -c "oc logs -f ${podName} -n ${namespace} > cypress/fixtures/${podName}/${podName}.log 2>&1 & echo \$! > cypress/fixtures/${podName}/${podName}.pid"`)
        cy.exec(`bash -c "oc logs -l app=odh-model-controller -f -n redhat-ods-applications > cypress/fixtures/${podName}/odh-model-controller.log 2>&1 &"`)
        cy.exec(`bash -c "oc logs -l app.kubernetes.io/name=kserve-controller-manager -f -n redhat-ods-applications > cypress/fixtures/${podName}/kserve-controller-manager.log 2>&1 &"`)
        cy.wrap(podName).as('podName')
      })

      projectDetails.findSectionTab('model-server').click();
      cy.get('[data-label="Status"] > div > button', { timeout: 120000 }).should('be.visible'); // no data test id while in loading state
      cy.get('[data-label="Status"] > div > button').click(); // no data test id while in loading state
      cy.get(`[data-testid="model-status-tooltip"]:contains('Loaded')`, { timeout: 2000000 });

      
      // cy.get('@podName').then((podName) => {
      //   cy.readFile(`cypress/fixtures/${podName}/${podName}.pid`).then((pid) => {
      //     cy.log(pid)
      //   })
      // })
    });
  });
}
