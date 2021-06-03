/**
 * Lambda: RequestContents
 * 컨텐츠 추천 요청
 */

const axios = require("axios");
const FormData = require("form-data");
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
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
      url: `http://49.50.173.151:5000/${type}/content`,
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    if (userId != -1) {
      const user = getUser(userId, type);
      const contents = axios(config);

      const response = await Promise.all([user, contents])
        .then((responses) => {
          const likeContents = responses[0].like[type];
          const dislikeContents = responses[0].dislike[type];
          const result = JSON.parse(responses[1].data.items);
          const contentsList = result.filter((item) => {
            item.preferenceFlag = likeContents.includes(item.idx) ? 1 : 0;
            item.image = `https://whatdoido.kro.kr/${type}/${item.idx}.jpg`;
            return !dislikeContents.includes(item.idx);
          });
          return { success: true, type, data: contentsList };
        })
        .catch(function (error) {
          console.log(error);
          throw new Error("컨텐츠 요청 중 에러가 발생하였습니다.");
        });
      return {
        body: response,
      };
    } else {
      const response = await axios(config)
        .then(function (response) {
          const result = JSON.parse(response.data.items);
          result.map((item) => {
            item.preferenceFlag = 0;
            item.image = `https://whatdoido.kro.kr/${type}/${item.idx}.jpg`;
            return item;
          });
          return { success: true, type, data: result };
        })
        .catch(function (error) {
          console.log(error);
          throw new Error("컨텐츠 요청 중 에러가 발생하였습니다.");
        });

      return {
        body: response,
      };
    }
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
      userId: userId,
      historyId: historyId,
    },
    ProjectionExpression: "#contentType, selected",
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

async function getUser(userId, type) {
  const params = {
    Key: {
      userId: userId,
    },
    ProjectionExpression: "#like.#contentType, #dislike.#contentType",
    ExpressionAttributeNames: {
      "#like": "like",
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
