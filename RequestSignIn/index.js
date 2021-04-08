const randomBytes = require("crypto").randomBytes;
const bcrypt = require("bcryptjs");

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { username, password } = event;

  try {
    const user = await getUser(username);

    const isSignedIn =
      user.Items.length > 0
        ? await bcrypt.compare(password, user.Items[0].Password)
        : false;

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
        password: user.Items[0].Password,
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
    // Specify which items in the results are returned.
    FilterExpression: "Username = :username",
    // Define the expression attribute value, which are substitutes for the values you want to compare.
    ExpressionAttributeValues: {
      ":username": username,
    },
    // Set the projection expression, which the the attributes that you want.
    ProjectionExpression: "UserId, Password, Username",
    TableName: "Users",
  };

  const user = ddb
    .scan(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to read item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
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
