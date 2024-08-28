const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'stav-shlomit-users-table';

exports.handler = async (event) => {
  const { userId } = event.pathParameters;

  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'userId is required' }),
    };
  }

  try {
    // First, check if the user exists
    const getParams = {
      TableName: TABLE_NAME,
      Key: { userId },
    };

    const { Item } = await dynamoDb.get(getParams).promise();

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // If the user exists, proceed with the delete operation
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { userId },
    };

    await dynamoDb.delete(deleteParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'User deleted successfully', userId }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error deleting user', e: error.message }),
    };
  }
};
