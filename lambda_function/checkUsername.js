/**
 * Lambda: CheckUsername
 * 아이디 중복 확인
 */

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
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

    return {
      statusCode: 200,
      body: { message: `${decodedUserName}은 사용가능한 아이디입니다.` },
    };
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
    ProjectionExpression: "userId",
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
