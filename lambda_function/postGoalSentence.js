/**
 * Lambda: PostGoalSentence
 * 희망 감정 문장 분석 및 대표 컨텐츠 추천
 */

const axios = require("axios");
const FormData = require("form-data");
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
const translateOptions = {
  headers: {
    "X-NCP-APIGW-API-KEY-ID": TRANSLATE_API_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": TRANSLATE_API_CLIENT_SECRET,
  },
};

exports.handler = async (event) => {
  const { userId, historyId, sentence } = event;

  if (!userId || !historyId) {
    return {
      body: { success: false, message: "userId 또는 historyId 가 입력되지 않았습니다." },
    };
  }
  if (!sentence || sentence == "") {
    return {
      body: { success: false, message: "문장이 입력되지 않았습니다." },
    };
  }

  try {
    const analyze = analyzeSentence(sentence);
    const getInfo = getTypeInit(userId, historyId);

    const { result, type, init } = await Promise.all([analyze, getInfo]).then((responses) => {
      const result = responses[0];
      const { sadness, joy, fear, disgust, anger } = result.emotion;
      if (sadness + joy + fear + disgust + anger == 0) {
        throw new Error("분석할 수 없는 문장입니다.");
      }
      const { type, init } = responses[1];
      return { result, type, init };
    });

    const update = updateHistory(userId, historyId, result);
    const recommend = recommendContents(userId, type, init, result.emotion, result.sentenceEn);

    const recommendedContents = await Promise.all([update, recommend]).then((responses) => {
      if (responses[1].length < 4) {
        throw new Error("컨텐츠 추천 과정에서 에러 발생");
      }
      responses[1].map((item) => {
        item.image = `https://whatdoido.kro.kr/${type}/${item.idx}.jpg`;
        return item;
      });

      return responses[1];
    });

    return {
      body: { success: true, type, contents: recommendedContents },
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

async function analyzeSentence(sentence) {
  //번역
  const translateResult = await axios.post(API_URL, { source: "ko", target: "en", text: sentence }, translateOptions);
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
  return naturalLanguageUnderstanding
    .analyze(analyzeParams)
    .then((analysisResults) => {
      return { sentence, emotion: analysisResults.result.emotion.document.emotion, sentenceEn };
    })
    .catch((err) => {
      if (err.code === 422) {
        throw new Error("문장이 너무 짧아서 분석할 수 없습니다.");
      }
      throw new Error("분석할 수 없는 문장입니다.");
    });
}

async function getTypeInit(userId, historyId) {
  const params = {
    Key: {
      userId: userId,
      historyId: historyId,
    },
    ProjectionExpression: "#contentType, init",
    ExpressionAttributeNames: {
      "#contentType": "type",
    },
    TableName: "History",
  };

  return ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}
async function getUserDislike(userId, type) {
  const params = {
    Key: {
      userId,
    },
    ProjectionExpression: "#dislike.#contentType",
    ExpressionAttributeNames: {
      "#dislike": "dislike",
      "#contentType": type,
    },
    TableName: "Users",
  };

  return ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
}

async function recommendContents(userId, type, init, emotion, sentence) {
  const dislikeList = userId == -1 ? [] : (await getUserDislike(userId, type)).dislike[type];
  const dislikeListStr = JSON.stringify(dislikeList);
  let form = new FormData();
  form.append("init_emotion", JSON.stringify(init.emotion));
  form.append("goal_emotion", JSON.stringify(emotion));
  form.append("idx_list", dislikeListStr);
  const resultsBySentiment = axios.post(`http://49.50.173.151:5000/${type}/emotion`, form, {
    headers: {
      ...form.getHeaders(),
    },
  });
  form = new FormData();
  form.append("sentence", sentence);
  form.append("idx_list", dislikeListStr);
  const resultsBySentence = axios.post(`http://49.50.173.151:5000/${type}/sentence`, form, {
    headers: {
      ...form.getHeaders(),
    },
  });
  return Promise.all([resultsBySentence, resultsBySentiment]).then((responses) => [
    ...responses[0].data,
    ...responses[1].data,
  ]);
}

async function updateHistory(userId, historyId, data) {
  const params = {
    TableName: "History",
    Key: {
      userId,
      historyId,
    },
    UpdateExpression: "set goal = :selectedSentence, updatedAt = :t",
    ExpressionAttributeValues: {
      ":selectedSentence": data,
      ":t": new Date().toISOString(),
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
