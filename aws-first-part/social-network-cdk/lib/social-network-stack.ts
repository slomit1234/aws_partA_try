import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class SocialNetworkStack extends cdk.Stack {
  private readonly table: dynamodb.Table;
  private readonly profilePicturesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use existing IAM role
    const labRole = iam.Role.fromRoleArn(this, 'Role', "arn:aws:iam::414526742113:role/LabRole", { mutable: false });

    // Use existing VPC
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-03667e42a5d7ab9d0',
    });

    // Define the DynamoDB table with the correct name
    const tableName = 'stav-shlomit-users-table';
    this.table = new dynamodb.Table(this, tableName, {
      tableName: tableName,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    this.table.grantFullAccess(labRole);

    // Define the S3 bucket for profile pictures
    this.profilePicturesBucket = new s3.Bucket(this, 'ProfilePicturesBucket', {
      bucketName: 'stav-shlomit-profile-pictures',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for development; use RETAIN for production
    });

    // Define the Lambda functions
    const createUserFunction = new lambda.Function(this, 'CreateUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/createUser'),
      handler: 'createUser.handler',
      environment: {
        TABLE_NAME: tableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const getUserFunction = new lambda.Function(this, 'GetUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/getUser'),
      handler: 'getUser.handler',
      environment: {
        TABLE_NAME: tableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const deleteUserFunction = new lambda.Function(this, 'DeleteUserFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/deleteUser'),
      handler: 'deleteUser.handler',
      environment: {
        TABLE_NAME: tableName,
      },
      vpc: vpc,
      role: labRole,
    });

    const updateUserProfilePictureFunction = new lambda.Function(this, 'UpdateUserProfilePictureFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/updateUserProfilePicture'),
      handler: 'updateUserProfilePicture.handler',
      environment: {
        TABLE_NAME: tableName,
        BUCKET_NAME: this.profilePicturesBucket.bucketName,
      },
      vpc: vpc,
      role: labRole,
    });

    const serveStaticContentFunction = new lambda.Function(this, 'ServeStaticContentFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/serveStaticContent'),
      handler: 'serveStaticContent.handler',
      vpc: vpc,
      role: labRole,
    });

    // Define the new Lambda function for getting all users
    const getAllUsersFunction = new lambda.Function(this, 'GetAllUsersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('../lambda/getAllUsers'), // Make sure this path is correct
      handler: 'getAllUsers.handler',
      vpc: vpc,
      role: labRole,
    });

    // Grant the Lambda functions appropriate permissions
    this.table.grantWriteData(createUserFunction);
    this.table.grantReadData(getUserFunction);
    this.table.grantWriteData(deleteUserFunction);
    this.table.grantWriteData(updateUserProfilePictureFunction);
    this.table.grantReadData(getAllUsersFunction);

    // Define an API Gateway to trigger the Lambda functions
    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Service',
      description: 'This service handles user operations.',
    });

    // Serve static content
    const staticContentIntegration = new apigateway.LambdaIntegration(serveStaticContentFunction);
    api.root.addMethod('GET', staticContentIntegration);

    // Create User API
    const createUserIntegration = new apigateway.LambdaIntegration(createUserFunction);
    api.root.addMethod('POST', createUserIntegration);

    // Get User API
    const getUserIntegration = new apigateway.LambdaIntegration(getUserFunction);
    const userResource = api.root.addResource('{userId}'); // Add a resource for /{userId}
    userResource.addMethod('GET', getUserIntegration);

    // Delete User API
    const deleteUserIntegration = new apigateway.LambdaIntegration(deleteUserFunction);
    userResource.addMethod('DELETE', deleteUserIntegration); // Add DELETE method for /{userId}

    // Update Profile Picture API
    const updateProfilePictureIntegration = new apigateway.LambdaIntegration(updateUserProfilePictureFunction);
    const updateProfilePictureResource = userResource.addResource('updateProfilePicture'); // Add /updateProfilePicture under /{userId}
    updateProfilePictureResource.addMethod('PUT', updateProfilePictureIntegration); // Add PUT method for /{userId}/updateProfilePicture

    // Add the new /users resource
    const usersResource = api.root.addResource('users');
    const getAllUsersIntegration = new apigateway.LambdaIntegration(getAllUsersFunction);
    usersResource.addMethod('GET', getAllUsersIntegration); // Add GET method for /users
  }
}
