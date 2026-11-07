import * as cdk from 'aws-cdk-lib';
import { AtelierStack } from '../lib/atelier-stack';

const app = new cdk.App();

new AtelierStack(app, 'dev-Atelier-Stack', {
  environmentName: 'dev',
  env: {
    account: '828748860265',
    region: 'eu-north-1',
  },
});
