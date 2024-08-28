const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3();
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'stav-shlomit-users-table';
const BUCKET_NAME = 'stav-shlomit-profile-pictures';

exports.handler = async (event) => {
  const { userId } = event.pathParameters;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId is required' }),
    };
  }

  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { userId },
    };

    const { Item } = await dynamoDb.get(params).promise();

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    let profilePictureUrl = Item.profilePictureUrl;

    if (profilePictureUrl) {
      // Generate a presigned URL for the profile picture if it exists
      const s3Params = {
        Bucket: BUCKET_NAME,
        Key: profilePictureUrl.replace(`https://${BUCKET_NAME}.s3.amazonaws.com/`, ''),
        Expires: 60, // URL expiration time in seconds
      };

      profilePictureUrl = s3.getSignedUrl('getObject', s3Params);
    } else {
      profilePictureUrl = null;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...Item,
        profilePictureUrl,
        hasProfilePicture: !!profilePictureUrl,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving user', e: error.message }),
    };
  }
};
