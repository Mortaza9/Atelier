import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { DATABASE_PORT } from './utils/constants';


export interface AtelierStackProps extends cdk.StackProps {
  environmentName: string;
  lambdaMemorySize: number;
  env: {
    account: string;
    region: string
  };
}

export class AtelierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtelierStackProps) {
    super(scope, id, props);

    // 1. Configure VPC with both Public (if needed for ALB/Gateway) and Isolated subnets
    const vpc = new ec2.Vpc(this, 'RdsVpc', {
      maxAzs: 2,
      natGateways: 0, // No NAT Gateway needed, saving cost!
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ]
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Allow inbound access to Postgres',
      allowAllOutbound: true,
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'RdsLambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda database client',
      allowAllOutbound: true,
    });

    const secretsManagerEndpointSecurityGroup = new ec2.SecurityGroup(this, 'SecretsManagerEndpointSecurityGroup', {
      vpc,
      description: 'Allow Lambda access to the Secrets Manager VPC endpoint',
      allowAllOutbound: true,
    });

    secretsManagerEndpointSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Allow Lambda HTTPS access to Secrets Manager'
    );

    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [secretsManagerEndpointSecurityGroup],
    });

    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(DATABASE_PORT),
      'Allow Lambda to access Postgres'
    );

    const database = new rds.DatabaseInstance(this, 'AtelierDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Securely isolated inside VPC
      },
      publiclyAccessible: false, // Not exposed to the public internet
      securityGroups: [dbSecurityGroup],
      allocatedStorage: 20,
      multiAz: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const environment = {
      REGION: props.env.region,
      SECRET_NAME: database.secret?.secretName as string,
    };

    const lambdas = [
      { id: 'CreatePlayersTable', entry: 'lib/migration/createTable.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'ListPlayers', entry: 'lib/lambda/player/list.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'GetPlayer', entry: 'lib/lambda/player/get.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'CreatePlayer', entry: 'lib/lambda/player/create.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'UpdatePlayer', entry: 'lib/lambda/player/update.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'DeletePlayer', entry: 'lib/lambda/player/delete.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
      { id: 'GetStatistics', entry: 'lib/lambda/statistics/get.lambda.ts', grant: (l: nodejs.NodejsFunction) => database.secret?.grantRead(l) },
    ];

    const lambdaFunctions: { [key: string]: nodejs.NodejsFunction } = {};

    for (const def of lambdas) {
      const fn = new nodejs.NodejsFunction(this, def.id, {
        runtime: lambda.Runtime.NODEJS_24_X,
        handler: 'handler',
        entry: def.entry,
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [lambdaSecurityGroup],
        environment,
        memorySize: props.lambdaMemorySize,
        timeout: cdk.Duration.seconds(30)
      });
      def.grant(fn);
      lambdaFunctions[def.id] = fn;
    }

    const api = new apigateway.RestApi(this, 'AtelierRestApi', {
      restApiName: `atelier-service-${props.environmentName}`,
      deployOptions: {
        stageName: 'v1',
      },
    });

    const players = api.root.addResource('players');
    players.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions['ListPlayers']));
    players.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions['CreatePlayer']));

    const player = players.addResource('{playerId}');
    player.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions['GetPlayer']));
    player.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions['UpdatePlayer']));
    player.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFunctions['DeletePlayer']));

    const statistics = players.addResource('statistics');
    statistics.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions['GetStatistics']));

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${api.url}players`,
      description: 'API Gateway Endpoint URL',
    });
  }
}