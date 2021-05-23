//Lambda: PostGoalSentence
const axios = require("axios");
const FormData = require("form-data");

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

const TRANSLATE_API_CLIENT_ID = process.env.CLIENT_ID;
const TRANSLATE_API_CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_URL = process.env.TRANSLATE_API_URL;
const translateOptions = {
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
    const result = await analyzeSentence(sentence);

    if (result.message) {
      return {
        body: { success: false, message: result.message },
      };
    }
    await updateHistory(userId, historyId, { sentence: result.sentence, emotion: result.emotion });
    const { type, init } = await getTypeInit(userId, historyId);
    const recommendedContents = await recommendContents(type, init, result.emotion, result.sentenceEn);
    if (recommendedContents.length < 4) {
      return {
        body: { success: false, message: "컨텐츠 추천 과정에서 에러 발생" },
      };
    }

    const response = {
      body: { success: true, type, contents: recommendedContents },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

async function analyzeSentence(sentence) {
  //번역
  const translateResult = await axios.post(API_URL, { source: "ko", target: "en", text: sentence }, translateOptions);
  const sentenceEn = translateResult.data.message.result.translatedText;
  console.log(sentenceEn);
  //감정분석
  const analyzeParams = {
    text: sentenceEn,
    features: {
      emotion: {
        document: true,
      },
    },
  };
  return await naturalLanguageUnderstanding
    .analyze(analyzeParams)
    .then((analysisResults) => {
      const { sadness, joy, fear, disgust, anger } = analysisResults.result.emotion.document.emotion;
      if (sadness + joy + fear + disgust + anger == 0) {
        return { message: "분석할 수 없는 문장입니다." };
      }

      return { sentence, emotion: analysisResults.result.emotion.document.emotion, sentenceEn };
    })
    .catch((err) => {
      if (err.code === 422) {
        return { message: "문장이 너무 짧아서 분석할 수 없습니다." };
      }
      return { message: "분석할 수 없는 문장입니다." };
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

  const { type, init } = await ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
  console.log("type: " + type);
  return { type, init };
}

async function recommendContents(type, init, emotion, sentence) {
  if (type == "movie") {
    let form = new FormData();
    form.append("init_emotion", JSON.stringify(init.emotion));
    form.append("goal_emotion", JSON.stringify(emotion));
    const resultsBySentiment = axios
      .post("http://49.50.173.151:5000/movie/emotion", form, {
        headers: {
          ...form.getHeaders(),
        },
      })
      .catch((err) => console.log(err));
    form = new FormData();
    form.append("sentence", sentence);
    const resultsBySentence = axios
      .post("http://49.50.173.151:5000/movie/sentence", form, {
        headers: {
          ...form.getHeaders(),
        },
      })
      .catch((err) => console.log(err));
    let contentsList = [];
    contentsList = await Promise.all([resultsBySentence, resultsBySentiment])
      .then((responses) => [...responses[0].data, ...responses[1].data])
      .catch((err) => console.log(err.message));
    return contentsList;
  } else {
    let form = new FormData();
    form.append("init_emotion", JSON.stringify(init.emotion));
    form.append("goal_emotion", JSON.stringify(emotion));
    const resultsBySentiment = axios
      .post("http://49.50.173.151:5000/book/emotion", form, {
        headers: {
          ...form.getHeaders(),
        },
      })
      .catch((err) => console.log(err));
    form = new FormData();
    form.append("sentence", sentence);
    const resultsBySentence = axios
      .post("http://49.50.173.151:5000/book/sentence", form, {
        headers: {
          ...form.getHeaders(),
        },
      })
      .catch((err) => console.log(err));
    let contentsList = [];
    contentsList = await Promise.all([resultsBySentence, resultsBySentiment])
      .then((responses) => [...responses[0].data, ...responses[1].data])
      .catch((err) => console.log(err.message));
    return contentsList;
  }
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

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    body: {
      success: false,
      message: errorMessage,
    },
  });
}
