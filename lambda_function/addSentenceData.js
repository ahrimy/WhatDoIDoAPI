/**
 * Lambda: AddSentence
 * DB에 문장 데이터 추가
 */

const uuid4 = require("uuid4");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const requestBody = event;
  const type = requestBody.type;
  console.log("입력데이터: " + requestBody);
  try {
    // 중복 문장 조회
    const sentence = await getSentence(requestBody.content).catch((err) => {
      console.log(err);
      throw new Error(err);
    });

    let sentenceId;
    let content;
    if (sentence.Items.length == 0) {
      sentenceId = uuid4();
      content = requestBody.content;
    } else {
      sentenceId = sentence.Items[0].sentenceId;
      content = sentence.Items[0].content;
    }

    // sentence 데이터 생성
    const result = await recordSentence(type, sentenceId, content).catch((err) => {
      console.log(err);
      throw new Error(err);
    });

    return {
      success: true,
      body: result,
    };
  } catch (err) {
    return {
      body: {
        success: false,
        message: err.message,
      },
    };
  }
};

async function getSentence(content) {
  const params = {
    FilterExpression: "content = :content",
    ExpressionAttributeValues: {
      ":content": content,
    },
    ProjectionExpression: "sentenceId, content",
    TableName: "Sentences",
  };

  return ddb.scan(params).promise();
}

async function recordSentence(type, sentenceId, content) {
  return ddb
    .put({
      TableName: "Sentences",
      Item: {
        type: type,
        sentenceId: sentenceId,
        content: content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    .promise();
}
