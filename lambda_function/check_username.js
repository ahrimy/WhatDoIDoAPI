const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { username } = event;
  const decodedUserName = decodeURI(username);

  try {
    // 아이디 조회
    const user = await getUser(decodedUserName);

    // 이미 존재한다면 conflict reponse
    if (user.Items.length > 0) {
      return {
        statusCode: 409,
        body: { message: "이미 존재하는 아이디 입니다." },
      };
    }

    const response = {
      statusCode: 200,
      body: { message: `${decodedUserName}은 사용가능한 아이디입니다.` },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

async function getUser(username) {
  const params = {
    FilterExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": username,
    },
    ProjectionExpression: "userId",
    TableName: "Users",
  };

  const user = ddb
    .scan(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
  return user;
}

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
