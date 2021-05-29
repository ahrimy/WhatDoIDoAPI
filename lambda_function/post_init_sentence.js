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
      body: { success: false, message: "userId가 입력되지 않았습니다." },
    };
  }
  if (!sentence || sentence == "") {
    return {
      body: { success: false, message: "문장이 입력되지 않았습니다." },
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
    const sentimentResult = await naturalLanguageUnderstanding
      .analyze(analyzeParams)
      .then((analysisResults) => {
        console.log(analysisResults);
        return analysisResults.result;
      })
      .catch((err) => {
        console.log(err);
        if (err.code === 422) {
          throw new Error("문장이 너무 짧아서 분석할 수 없습니다.");
        }
        throw new Error("분석할 수 없는 문장입니다.");
      });

    // History 생성
    // 감정분석 결과 저장
    const { sadness, joy, fear, disgust, anger } = sentimentResult.emotion.document.emotion;
    console.log(sentimentResult.emotion.document.emotion);
    if (sadness + joy + fear + disgust + anger == 0) {
      throw new Error("분석할 수 없는 문장입니다.");
    }
    const historyId = toUrlString(randomBytes(16));
    const payload = {
      userId,
      historyId,
      init: {
        sentence,
        emotion: { sadness, joy, disgust, fear, anger },
      },
      type,
      like: { book: [], movie: [] },
      dislike: { book: [], movie: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await recordHistory(payload);

    const response = {
      body: { success: true, historyId },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

function toUrlString(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function recordHistory(data) {
  return await ddb
    .put({
      TableName: "History",
      Item: data,
    })
    .promise();
}

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    body: {
      success: false,
      message: errorMessage,
    },
  });
}
