/**
 * Lambda: RequestSignUp
 * 회원가입
 */

const bcrypt = require("bcryptjs");
const uuid4 = require("uuid4");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { username, password, gender, age } = event;

  try {
    // 아이디 중복확인 한번더
    const user = await getUsername(username);

    if (user.Items.length > 0) {
      return {
        statusCode: 409,
        body: { message: "이미 존재하는 아이디 입니다." },
      };
    }

    // 중복 아닌경우
    const userId = uuid4();
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
    await createUser(payload);

    return {
      statusCode: 201,
      body: { message: `${username}님, 가입이 완료되었습니다.` },
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

async function getUsername(username) {
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

async function createUser(data) {
  return ddb
    .put({
      TableName: "Users",
      Item: data,
    })
    .promise()
    .catch((err) => {
      console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
