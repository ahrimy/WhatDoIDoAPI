const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { userId } = event;
  if (!userId) {
    return {
      statusCode: 403,
      body: { message: "잘못된 접근입니다." },
    };
  }

  try {
    const history = await getHistory(userId);
    const user = await getUser(userId);

    const response = {
      statusCode: 200,
      body: { user, history },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function getHistory(userId) {
  const params = {
    FilterExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ExpressionAttributeNames: {
      "#contentType": "type",
    },
    ProjectionExpression: "historyId, sentence, emotion, #contentType, selected, preferred",
    TableName: "History",
  };

  return ddb
    .scan(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}

async function getUser(userId) {
  const params = {
    Key: {
      userId: userId,
    },
    ProjectionExpression: "username, age, gender",
    TableName: "Users",
  };

  return ddb
    .get(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
