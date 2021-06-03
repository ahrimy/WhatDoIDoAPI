/**
 * Lambda: RequestSentences
 * 예시 문장 요청
 */

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, historyId } = event;

  if (!userId || !historyId) {
    return {
      body: { success: false, message: "userId 또는 historyId가 입력되지 않았습니다." },
    };
  }

  try {
    const history = await getHistory(userId, historyId);
    if (!history.Item) {
      return {
        body: { success: false, message: "History 조회 불가" },
      };
    }

    //감정분석 결과 정렬
    const { sadness, joy, fear, disgust, anger } = history.Item.init.emotion;
    const emotions = [
      {
        type: "sadness",
        score: sadness,
      },
      {
        type: "joy",
        score: joy,
      },
      {
        type: "fear",
        score: fear,
      },
      {
        type: "disgust",
        score: disgust,
      },
      {
        type: "anger",
        score: anger,
      },
    ];

    emotions.sort(function (a, b) {
      return b.score - a.score;
    });

    // DB 에서 문장 조회
    const userEmotion = emotions[0].type;
    const sentences = [];
    let result = await getSentence(userEmotion);
    let itemList = result.Items;
    let index = 0;

    // 랜덤으로 4개 선택
    for (let i = 0; i < 4; i++) {
      index = Math.floor(Math.random() * itemList.length);
      sentences.push(itemList.splice(index, 1));
    }

    return {
      body: { success: true, emotion: userEmotion, sentences },
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

async function getHistory(userId, historyId) {
  const params = {
    Key: {
      userId,
      historyId,
    },
    ProjectionExpression: "init",
    TableName: "History",
  };

  return ddb
    .get(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}

async function getSentence(type) {
  const params = {
    FilterExpression: "#contentType = :contentType",
    ExpressionAttributeValues: {
      ":contentType": type,
    },
    ExpressionAttributeNames: {
      "#contentType": "type",
    },
    ProjectionExpression: "sentenceId, content, #contentType",
    TableName: "Sentences",
  };

  return ddb
    .scan(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
