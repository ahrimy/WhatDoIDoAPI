/**
 * Lambda: RequestAnalysis
 * 초기 감정 문장 분석 및 History 생성
 */

const uuid4 = require("uuid4");
const axios = require("axios");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

// watson NLU 설정
const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: "2020-08-01",
  authenticator: new IamAuthenticator({
    apikey: process.env.SENTIMENT_API_KEY,
  }),
  serviceUrl: process.env.SENTIMENT_API_URL,
});

// PAPAGO Translate 설정
const TRANSLATE_API_CLIENT_ID = process.env.CLIENT_ID;
const TRANSLATE_API_CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_URL = process.env.TRANSLATE_API_URL;
const options = {
  headers: {
    "X-NCP-APIGW-API-KEY-ID": TRANSLATE_API_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": TRANSLATE_API_CLIENT_SECRET,
  },
};

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
        return analysisResults.result;
      })
      .catch((err) => {
        if (err.code === 422) {
          throw new Error("문장이 너무 짧아서 분석할 수 없습니다.");
        }
        throw new Error("분석할 수 없는 문장입니다.");
      });

    // History 생성
    // 감정분석 결과 저장
    const { sadness, joy, fear, disgust, anger } = sentimentResult.emotion.document.emotion;
    if (sadness + joy + fear + disgust + anger == 0) {
      throw new Error("분석할 수 없는 문장입니다.");
    }
    const historyId = uuid4();
    const payload = {
      userId,
      historyId,
      init: {
        sentence,
        emotion: { sadness, joy, disgust, fear, anger },
      },
      type,
      like: [],
      dislike: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createHistory(payload);

    return {
      body: { success: true, historyId },
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

async function createHistory(data) {
  return ddb
    .put({
      TableName: "History",
      Item: data,
    })
    .promise()
    .catch((err) => {
      console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
