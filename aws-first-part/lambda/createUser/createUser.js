const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'us-east-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'stav-shlomit-users-table';

exports.handler = async (event) => {
  const { name, email, age, address } = JSON.parse(event.body); // Add optional fields here

  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Name is required' }),
    };
  }

  try {
    const userId = uuidv4();

    // Construct the item to put into DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId,
        name,
        ...(email && { email }), // Add email if provided
        ...(age && { age }), // Add age if provided
        ...(address && { address }), // Add address if provided
      },
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ userId, name, email, age, address }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error creating user', e: error.message }),
    };
  }
};
