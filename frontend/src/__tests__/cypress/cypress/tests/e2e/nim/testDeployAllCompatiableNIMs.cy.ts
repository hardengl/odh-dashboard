import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  projectListPage,
  createProjectModal,
  projectDetails,
  projectDetailsOverviewTab,
} from '~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import {
  verifyOpenShiftProjectExists,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { nimDeployModal } from '../../../pages/components/NIMDeployModal';
import { writePodLogToFile, writeResourceToFile } from '../../../utils/oc_commands/baseCommands';

let models = [
  // "alphafold2-latest",
  // "alphafold2-multimer-latest",
  // "audio2face-3d-latest",
  // "codellama-13b-instruct-latest",
  // "codellama-34b-instruct-latest",
  // "codellama-70b-instruct-latest",
  // "corrdiff-latest",
  // "diffdock-latest",
  // "fastpitch-hifigan-tts-latest",
  // "fourcastnet-latest",
  // "gemma-2-2b-instruct-latest",
  // "gemma-2-9b-it-latest",
  // "genmol-latest",
  // "llama-2-13b-chat-latest",
  // "llama-2-70b-chat-latest",
  // "llama-2-7b-chat-latest",
  // "llama-3-sqlcoder-8b-latest",
  'llama-3-swallow-70b-instruct-v0.1-latest',
  // "llama-3-taiwan-70b-instruct-latest",
  // "llama-3.1-405b-instruct-latest",
  // "llama-3.1-70b-instruct-latest",
  // "llama-3.1-70b-instruct-pb24h2-latest",
  'llama-3.1-8b-base-latest',
  'llama-3.1-8b-instruct-latest',
  // "llama-3.1-8b-instruct-pb24h2-latest",
  // "llama-3.1-nemoguard-8b-content-safety-latest",
  // "llama-3.1-nemoguard-8b-topic-control-latest",
  // "llama-3.1-nemotron-70b-instruct-latest",
  // "llama-3.1-swallow-70b-instruct-v0.1-latest",
  // "llama-3.1-swallow-8b-instruct-v0.1-latest",
  // "llama-3.2-11b-vision-instruct-latest",
  // "llama-3.2-90b-vision-instruct-latest",
  // "llama-3.2-nv-embedqa-1b-v2-latest",
  // "llama-3.2-nv-rerankqa-1b-v2-latest",
  // "llama3-70b-instruct-latest",
  // "llama3-8b-instruct-latest",
  // "maisi-latest",
  // "maxine-eye-contact-latest",
  // "maxine-studio-voice-latest",
  // "megatron-1b-nmt-latest",
  // "mistral-7b-instruct-v0.3-latest",
  // "mistral-nemo-12b-instruct-latest",
  // "mistral-nemo-minitron-8b-8k-instruct-latest",
  // "mixtral-8x22b-instruct-v01-latest",
  // "mixtral-8x7b-instruct-v01-latest",
  // "nemotron-4-340b-instruct-latest",
  // "nemotron-4-340b-reward-latest",
  // "nv-embedqa-e5-v5-latest",
  // "nv-embedqa-e5-v5-pb24h2-latest",
  // "nvclip-latest",
  // "parakeet-ctc-1.1b-asr-latest",
  'phi-3-mini-4k-instruct-latest',
  // "phind-codellama-34b-v2-instruct-latest",
  // "proteinmpnn-latest",
  // "qwen-2.5-7b-instruct-latest",
  // "rfdiffusion-latest",
  // "vista3d-latest"
];

for (let i = 0; i < models.length; i++) {
  describe(`Deploy NIM model`, () => {
    const randomNum = () => Cypress._.random(0, 1e6);
    const randomNumber = randomNum();
    let testData: DataScienceProjectData;

    // Setup: Load test data and ensure clean state
    before(() => {
      return cy
        .fixture('e2e/nim/testDeploySingleNIMInNamespace.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as DataScienceProjectData;
          const projectName = `${testData.projectResourceName}-${randomNumber}`;

          if (!projectName) {
            throw new Error('Project name is undefined or empty');
          }

          return verifyOpenShiftProjectExists(projectName);
        })
        .then((exists: boolean) => {
          const projectName = `${testData.projectResourceName}-${randomNumber}`;
          // Clean up existing project if it exists
          if (exists) {
            cy.log(`Project ${projectName} exists. Deleting before test.`);
            return deleteOpenShiftProject(projectName);
          }
          cy.log(`Project ${projectName} does not exist. Proceeding with test.`);
          // Return a resolved promise to ensure a value is always returned
          return cy.wrap(null);
        });
    });

    after(() => {
      writePodLogToFile(
        `serving.kserve.io/inferenceservice=${models[i]}`,
        `${testData.projectDisplayName}-${randomNumber}`,
        models[i],
      );
      writeResourceToFile(
        'inferenceservice',
        models[i],
        `${testData.projectDisplayName}-${randomNumber}`,
        models[i],
      );
      deleteOpenShiftProject(`${testData.projectDisplayName}-${randomNumber}`);
    });

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
      nimDeployModal.findNimStorageSizeInput().type('{selectall}50');
      nimDeployModal.findModelServerSizeSelect().findSelectOption(/Large/).click();
      nimDeployModal.selectAccelerator('NVIDIA GPU');
      nimDeployModal.findSubmitButton().click();
      projectDetails.findSectionTab('model-server').click();
      cy.get('div > .pf-v6-c-icon > .pf-v6-c-icon__content').click(); // no data test id while in loading state
      cy.get(`[data-testid="model-status-tooltip"]:contains('Loaded')`, { timeout: 900000 });
    });
  });
}
