const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'stav-shlomit-users-table';
const BUCKET_NAME = 'stav-shlomit-profile-pictures';

exports.handler = async (event) => {
  const userId = event.pathParameters.userId;

  // Get the content type from headers
  const contentType = event.headers['content-type'];

  if (!userId || !event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId and file data are required' }),
    };
  }

  // Upload the picture to S3 using userId as the key
  const s3Params = {
    Bucket: BUCKET_NAME,
    Key: `profile-pictures/${userId}`, // Use userId as the key
    Body: Buffer.from(event.body, 'base64'), // Decode base64 data
    ContentType: contentType,
  };

  try {
    await s3.upload(s3Params).promise();
    
    // Construct the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Params.Key}`;

    // Update DynamoDB with the S3 URL
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression: 'set profilePictureUrl = :url',
      ExpressionAttributeValues: {
        ':url': s3Url,
      },
      ReturnValues: 'UPDATED_NEW',
    };

    const result = await docClient.update(updateParams).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error('Error uploading picture or updating user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
