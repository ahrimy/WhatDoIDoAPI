const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { username } = event;

  try {
    // 아이디 조회
    const user = await getUser(username);

    // 이미 존재한다면 conflict reponse
    if (user.Items.length > 0) {
      return {
        statusCode: 409,
        body: { message: "이미 존재하는 아이디 입니다." },
      };
    }

    const response = {
      statusCode: 200,
      body: { message: `${username}은 사용가능한 아이디입니다.` },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

function toUrlString(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getUser(username) {
  const params = {
    // Specify which items in the results are returned.
    FilterExpression: "Username = :username",
    // Define the expression attribute value, which are substitutes for the values you want to compare.
    ExpressionAttributeValues: {
      ":username": username,
    },
    // Set the projection expression, which the the attributes that you want.
    ProjectionExpression: "UserId",
    TableName: "Users",
  };

  const user = ddb
    .scan(params, function (err, data) {
      if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      }
      return data;
    })
    .promise();

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
