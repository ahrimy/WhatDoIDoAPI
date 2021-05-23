//Lambda: RequestContents
const axios = require("axios");
const FormData = require("form-data");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  try {
    const { userId, historyId } = event;

    if (!userId || !historyId) {
      return {
        body: { success: false, message: "userId 또는 historyId가 입력되지 않았습니다." },
      };
    }
    const history = await getHistory(userId, historyId);
    if (!history) {
      return {
        body: { success: false, message: "History 조회 불가" },
      };
    }
    const { type, selected } = history;
    if (!type || !selected) {
      return {
        body: { success: false, message: "정상적으로 처리되지 않은 요청입니다. (Histroy 조회 불가)" },
      };
    }
    const selected_items = selected.map((item) => item.title);
    const data = new FormData();
    data.append("selected_items", JSON.stringify(selected_items));
    data.append("counts_per_item", "20");

    const config = {
      method: "post",
      url: type == "book" ? "http://49.50.173.151:5000/book/content" : "http://49.50.173.151:5000/movie/content",
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    const response = await axios(config)
      .then(function (response) {
        const result = JSON.parse(response.data.items);
        return { success: true, data: result };
      })
      .catch(function (error) {
        console.log(error);
        return { success: false, message: "컨텐츠 요청 중 에러가 발생하였습니다." };
      });

    return {
      body: response,
    };
  } catch (err) {
    errorResponse(err.message, callback);
  }
};

async function getHistory(userId, historyId) {
  const params = {
    Key: {
      userId: userId,
      historyId: historyId,
    },
    ProjectionExpression: "#contentType, selected",
    ExpressionAttributeNames: {
      "#contentType": "type",
    },
    TableName: "History",
  };

  return await ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    });
}

function errorResponse(errorMessage, callback) {
  callback(null, {
    body: {
      success: false,
      message: errorMessage,
    },
  });
}
