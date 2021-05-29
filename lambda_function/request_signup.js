const randomBytes = require("crypto").randomBytes;
const bcrypt = require("bcryptjs");

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { username, password, gender, age } = event;

  try {
    // 아이디 중복확인 한번더
    const user = await getUser(username);

    if (user.Items.length > 0) {
      return {
        statusCode: 409,
        body: { message: "이미 존재하는 아이디 입니다." },
      };
    }

    // 중복 아닌경우
    const userId = toUrlString(randomBytes(16));
    const hash = await bcrypt.hash(password, 8);
    // user 데이터 생성
    const payload = {
      userId,
      username,
      password: hash,
      gender,
      age,
      like: { book: [], movie: [] },
      dislike: { book: [], movie: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await recordUser(payload);

    const response = {
      statusCode: 201,
      body: { message: `${username}님, 가입이 완료되었습니다.` },
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

async function recordUser(data) {
  return await ddb
    .put({
      TableName: "Users",
      Item: data,
    })
    .promise();
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
