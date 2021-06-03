/**
 * Lambda: RequestSignIn
 * 로그인
 */

const bcrypt = require("bcryptjs");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { username, password } = event;

  try {
    const user = await getUser(username);

    const isSignedIn = user.Items.length > 0 ? await bcrypt.compare(password, user.Items[0].password) : false;

    if (!isSignedIn) {
      return {
        statusCode: 401,
        body: { message: "아이디와 비밀번호를 확인하세요" },
      };
    }

    const response = {
      statusCode: 200,
      body: {
        username: user.Items[0].username,
        userId: user.Items[0].userId,
      },
    };

    return response;
  } catch (err) {
    return {
      statusCode: 500,
      body: {
        success: false,
        message: err.message,
      },
    };
  }
};

async function getUser(username) {
  const params = {
    FilterExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": username,
    },
    ProjectionExpression: "userId, password, username",
    TableName: "Users",
  };

  return ddb
    .scan(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
