const randomBytes = require("crypto").randomBytes;
const bcrypt = require("bcryptjs");

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { username, password } = event;

  try {
    const user = await getUser(username);

    const isSignedIn = user.Items.length > 0 ? await bcrypt.compare(password, user.Items[0].Password) : false;

    if (!isSignedIn) {
      return {
        statusCode: 401,
        body: { message: "아이디와 비밀번호를 확인하세요" },
      };
    }

    const response = {
      statusCode: 200,
      body: {
        username: user.Items[0].Username,
        userId: user.Items[0].UserId,
      },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

async function getUser(username) {
  const params = {
    FilterExpression: "Username = :username",
    ExpressionAttributeValues: {
      ":username": username,
    },
    ProjectionExpression: "UserId, Password, Username",
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
