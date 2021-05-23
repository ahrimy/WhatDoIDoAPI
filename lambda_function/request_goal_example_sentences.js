//Lambda: RequestSentences
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
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

    //DB 에서 문장 조회
    const userEmotion = [emotions[0].type];
    const sentences = [];
    let result = await getSentence(userEmotion[0]);
    let itemList = result.Items;
    let index = 0;
    // if (emotions[0].score > 0.8) {
    for (let i = 0; i < 4; i++) {
      index = Math.floor(Math.random() * itemList.length);
      sentences.push(itemList.splice(index, 1));
    }
    // } else {
    //   userEmotion.push(emotions[1].type);
    //   for (let i = 0; i < 2; i++) {
    //     index = Math.floor(Math.random() * itemList.length);
    //     sentences.push(itemList.splice(index, 1));
    //   }
    //   result = await getSentence(userEmotion[1], sentences[0].SentenceId, sentences[1].SentenceId);
    //   itemList = result.Items;
    //   for (let i = 0; i < 2; i++) {
    //     index = Math.floor(Math.random() * itemList.length);
    //     sentences.push(itemList.splice(index, 1));
    //   }
    // }

    const response = {
      body: { success: true, emotion: userEmotion[0], sentences },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, callback);
  }
};

function errorResponse(errorMessage, callback) {
  callback(null, {
    body: {
      success: false,
      message: errorMessage,
    },
  });
}

async function getHistory(userId, historyId) {
  const params = {
    Key: {
      userId: userId,
      historyId: historyId,
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

async function getSentence(type, id1, id2) {
  const params = {
    FilterExpression: id1
      ? "#contentType = :contentType AND not (content in (:id1, :id2))"
      : "#contentType = :contentType",
    ExpressionAttributeValues: id1
      ? {
          ":contentType": type,
          ":id1": id1,
          ":id2": id2,
        }
      : {
          ":contentType": type,
        },
    ExpressionAttributeNames: {
      "#contentType": "type",
    },
    ProjectionExpression: "sentenceId, content, #contentType",
    TableName: "Sentences",
  };

  const sentence = ddb
    .scan(params)
    .promise()
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });

  return sentence;
}
