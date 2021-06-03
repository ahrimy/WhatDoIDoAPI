/**
 * Lambda: DeleteContentsPreference
 * 컨텐츠에 대한 사용자의 선호도 삭제
 */

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, historyId, contentId, isLike, type } = event;

  if (!userId) {
    return {
      body: {
        success: false,
        message: "userId가 입력되지 않았습니다.",
      },
    };
  }
  if (!contentId || isLike == undefined || !type) {
    return {
      body: { success: false, message: "데이터가 충분하지 않습니다." },
    };
  }

  try {
    if (userId == -1) {
      await updateHistoryPreference({
        userId,
        historyId,
        type,
        isLike,
        contentId,
      }).catch((err) => {
        console.log(err.message);
        throw new Error(err);
      });
    } else if (userId != -1 && !historyId) {
      await updateUserPreference({
        userId,
        type,
        isLike,
        contentId,
      }).catch((err) => {
        console.log(err.message);
        throw new Error(err);
      });
    } else {
      const userPreference = updateUserPreference({
        userId,
        type,
        isLike,
        contentId,
      });
      const historyPreference = updateHistoryPreference({
        userId,
        historyId,
        type,
        isLike,
        contentId,
      });
      await Promise.all([userPreference, historyPreference]).catch((err) => {
        console.log(err.message);
        throw new Error(err);
      });
    }

    return {
      body: { success: true },
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

// isLike && type == book ? like book
// !isLike && type == book ? dislike book
// isLike && type == movie ? like movie
// !isLike && type == movie ? dislike movie
async function updateUserPreference({ userId, type, isLike, contentId }) {
  const preference = await getUser({ userId, type, isLike });
  const contentsList = preference[isLike ? "like" : "dislike"][type];
  const idx = contentsList.indexOf(contentId);

  if (idx > -1) {
    contentsList.splice(idx, 1);
  }

  return updateUser({
    userId,
    isLike,
    type,
    contentsList,
  });
}
async function updateHistoryPreference({ userId, historyId, type, isLike, contentId }) {
  const preference = await getHistory({ userId, historyId, isLike });
  const contentsList = preference[isLike ? "like" : "dislike"];
  const idx = contentsList.indexOf(contentId);

  if (idx > -1) {
    contentsList.splice(idx, 1);
  }

  return updateHistory({
    userId,
    historyId,
    isLike,
    contentsList,
  });
}

async function updateHistory({ userId, historyId, isLike, contentsList }) {
  const params = {
    TableName: "History",
    Key: {
      userId,
      historyId,
    },
    UpdateExpression: `set #preference = :contentsIdx, updatedAt = :t`,
    ExpressionAttributeNames: {
      "#preference": isLike ? "like" : "dislike",
    },
    ExpressionAttributeValues: {
      ":contentsIdx": contentsList,
      ":t": new Date().toISOString(),
    },
    ReturnValues: "UPDATED_NEW",
  };

  return ddb.update(params).promise();
}
async function updateUser({ userId, isLike, type, contentsList }) {
  if (userId != -1) {
    const params = {
      TableName: "Users",
      Key: {
        userId,
      },
      UpdateExpression: `set #preference.#type = :contentsIdx, updatedAt = :t`,
      ExpressionAttributeNames: {
        "#preference": isLike ? "like" : "dislike",
        "#type": type,
      },
      ExpressionAttributeValues: {
        ":contentsIdx": contentsList,
        ":t": new Date().toISOString(),
      },
      ReturnValues: "UPDATED_NEW",
    };

    return ddb.update(params).promise();
  }
}

async function getUser({ userId, type, isLike }) {
  const params = {
    Key: {
      userId: userId,
    },
    ProjectionExpression: "#preference.#contentType",
    ExpressionAttributeNames: {
      "#preference": isLike ? "like" : "dislike",
      "#contentType": type,
    },
    TableName: "Users",
  };

  return ddb
    .get(params)
    .promise()
    .then((data) => data.Item);
}
async function getHistory({ userId, historyId, isLike }) {
  const params = {
    Key: {
      userId,
      historyId,
    },
    ProjectionExpression: "#preference",
    ExpressionAttributeNames: {
      "#preference": isLike ? "like" : "dislike",
    },
    TableName: "History",
  };

  return ddb
    .get(params)
    .promise()
    .then((data) => data.Item);
}
