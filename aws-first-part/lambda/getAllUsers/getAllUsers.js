const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'stav-shlomit-users-table';

exports.handler = async () => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const data = await dynamoDb.scan(params).promise();
    
    const userIds = data.Items.map(item => ({
      userId: item.userId
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(userIds),
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
