const randomBytes = require("crypto").randomBytes;

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const requestBody = event;
  console.log("입력데이터: " + requestBody);

  // sentence ID 생성
  // const sentenceId = toUrlString(randomBytes(16));

  const type = requestBody.type;
  // 중복 문장 조회
  const sentence = await getSentence(requestBody.content);

  let sentenceId;
  let content;
  if (sentence.Items.length == 0) {
    sentenceId = toUrlString(randomBytes(16));
    content = requestBody.content;
  } else {
    sentenceId = sentence.Items[0].SentenceId;
    content = sentence.Items[0].Content;
  }

  // sentence 데이터 생성
  const result = await recordSentence(type, sentenceId, content);

  const response = {
    statusCode: 200,
    body: JSON.stringify(result),
  };

  return response;
};

function toUrlString(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getSentence(content) {
  const params = {
    // Specify which items in the results are returned.
    FilterExpression: "Content = :content",
    // Define the expression attribute value, which are substitutes for the values you want to compare.
    ExpressionAttributeValues: {
      ":content": content,
    },
    // Set the projection expression, which the the attributes that you want.
    ProjectionExpression: "SentenceId, Content",
    TableName: "Sentences",
  };

  const sentence = ddb
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

  return sentence;
}

async function recordSentence(type, sentenceId, content) {
  return await ddb
    .put({
      TableName: "Sentences",
      Item: {
        Type: type,
        SentenceId: sentenceId,
        Content: content,
        RequestTime: new Date().toISOString(),
      },
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
