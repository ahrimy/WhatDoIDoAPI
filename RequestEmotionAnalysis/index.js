const randomBytes = require("crypto").randomBytes;
const axios = require("axios");

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

const TRANSLATE_API_CLIENT_ID = process.env.CLIENT_ID;
const TRANSLATE_API_CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_URL = process.env.TRANSLATE_API_URL;
const options = {
  headers: {
    "X-NCP-APIGW-API-KEY-ID": TRANSLATE_API_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": TRANSLATE_API_CLIENT_SECRET,
  },
};

const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: "2020-08-01",
  authenticator: new IamAuthenticator({
    apikey: process.env.SENTIMENT_API_KEY,
  }),
  serviceUrl: process.env.SENTIMENT_API_URL,
});

exports.handler = async (event, context, callback) => {
  const { userId, sentence, type } = event;
  if (!userId) {
    return {
      statusCode: 403,
      body: { message: "잘못된 접근입니다." },
    };
  }

  try {
    //번역
    const translateResult = await axios.post(API_URL, { source: "ko", target: "en", text: sentence }, options);
    const sentenceEn = translateResult.data.message.result.translatedText;

    //감정분석
    const analyzeParams = {
      text: sentenceEn,
      features: {
        emotion: {
          document: true,
        },
      },
    };
    const sentimentResult = await naturalLanguageUnderstanding.analyze(analyzeParams).then((analysisResults) => {
      return analysisResults.result;
    });

    //감정분석 결과 정렬
    const { sadness, joy, fear, disgust, anger } = sentimentResult.emotion.document.emotion;
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
    if (emotions[0].score > 0.8) {
      for (let i = 0; i < 4; i++) {
        index = Math.floor(Math.random() * itemList.length);
        sentences.push(itemList.splice(index, 1));
      }
    } else {
      userEmotion.push(emotions[1].type);
      for (let i = 0; i < 2; i++) {
        index = Math.floor(Math.random() * itemList.length);
        sentences.push(itemList.splice(index, 1));
      }
      result = await getSentence(userEmotion[1], sentences[0].SentenceId, sentences[1].SentenceId);
      itemList = result.Items;
      for (let i = 0; i < 2; i++) {
        index = Math.floor(Math.random() * itemList.length);
        sentences.push(itemList.splice(index, 1));
      }
    }

    // History 저장
    const data = {
      HistoryId: toUrlString(randomBytes(16)),
      Emotion: { Sadness: sadness, Joy: joy, Disgust: disgust, Fear: fear, Anger: anger },
      Type: type,
      RequestTime: new Date().toISOString(),
    };
    await recordHistory(userId, data);

    const response = {
      statusCode: 200,
      body: { emotion: userEmotion, sentences },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

function toUrlString(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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

async function getSentence(type, id1, id2) {
  const params = {
    FilterExpression: id1
      ? "#contentType = :contentType AND not (Content in (:id1, :id2))"
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
      "#contentType": "Type",
    },
    ProjectionExpression: "SentenceId, Content, #contentType",
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

async function recordHistory(userId, data) {
  const params = {
    TableName: "Users",
    Key: {
      UserId: userId,
    },
    UpdateExpression: "set History = list_append(if_not_exists(History, :empty_list), :history)",
    ExpressionAttributeValues: {
      ":history": [data],
      ":empty_list": [],
    },
    ReturnValues: "UPDATED_NEW",
  };

  return ddb
    .update(params)
    .promise()
    .catch((err) => {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
