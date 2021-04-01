const axios = require("axios");

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

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
  // 사용자가 입력한 문장
  const query = JSON.parse(event.body).sentence;
  console.log("한글: " + query);

  //번역
  const translateResult = await axios
    .post(API_URL, { source: "ko", target: "en", text: query }, options)
    .catch((err) => {
      errorResponse(err.message, context.awsRequestId, callback);
    });
  const sentence = translateResult.data.message.result.translatedText;
  console.log("영어: " + sentence);

  //TODO: 감정분석

  //TODO: DB 조회

  const response = {
    statusCode: 200,
    body: sentence,
  };

  return response;
};

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
