/**
 * Lambda: PostContentsPreference
 * 컨텐츠에 대한 사용자의 선호도 저장
 */

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { userId, historyId, contentId, isLike, type } = event;

  if (!userId || !historyId) {
    return {
      body: {
        success: false,
        message: "userId 또는 historyId가 입력되지 않았습니다.",
      },
    };
  }
  if (!contentId || isLike == undefined || !type) {
    return {
      body: { success: false, message: "데이터가 충분하지 않습니다." },
    };
  }

  try {
    if (userId != -1) {
      const userPreference = updateUserPreference({
        userId,
        type,
        isLike,
        contentId,
      });
      const historyPreference = updateHistoryPreference({
        userId,
        historyId,
        isLike,
        contentId,
      });
      await Promise.all([userPreference, historyPreference]).catch((err) => {
        console.log(err.message);
        throw new Error(err);
      });
    } else {
      await updateHistoryPreference({
        userId,
        historyId,
        isLike,
        contentId,
      }).catch((err) => {
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
  const preference = await getUser({ userId, type });
  const dislikeContents = preference.dislike[type];
  const likeContents = preference.like[type];
  const dislikeIdx = dislikeContents.indexOf(contentId);
  const likeIdx = likeContents.indexOf(contentId);
  if (isLike) {
    if (dislikeIdx > -1) {
      dislikeContents.splice(dislikeIdx, 1);
    }
    if (likeIdx == -1) {
      likeContents.push(contentId);
    }
  } else {
    if (likeIdx > -1) {
      likeContents.splice(likeIdx, 1);
    }
    if (dislikeIdx == -1) {
      dislikeContents.push(contentId);
    }
  }
  return updateUser({
    userId,
    type,
    dislikeContents,
    likeContents,
  });
}
async function updateHistoryPreference({ userId, historyId, isLike, contentId }) {
  const preference = await getHistory({ userId, historyId });
  const dislikeContents = preference.dislike;
  const likeContents = preference.like;
  const dislikeIdx = dislikeContents.indexOf(contentId);
  const likeIdx = likeContents.indexOf(contentId);
  if (isLike) {
    if (dislikeIdx > -1) {
      dislikeContents.splice(dislikeIdx, 1);
    }
    if (likeIdx == -1) {
      likeContents.push(contentId);
    }
  } else {
    if (likeIdx > -1) {
      likeContents.splice(likeIdx, 1);
    }
    if (dislikeIdx == -1) {
      dislikeContents.push(contentId);
    }
  }
  return updateHistory({
    userId,
    historyId,
    dislikeContents,
    likeContents,
  });
}

async function updateHistory({ userId, historyId, dislikeContents, likeContents }) {
  const params = {
    TableName: "History",
    Key: {
      userId,
      historyId,
    },
    UpdateExpression: `set #like = :likeContents, #dislike = :dislikeContents, updatedAt = :t`,
    ExpressionAttributeNames: {
      "#like": "like",
      "#dislike": "dislike",
    },
    ExpressionAttributeValues: {
      ":dislikeContents": dislikeContents,
      ":likeContents": likeContents,
      ":t": new Date().toISOString(),
    },
    ReturnValues: "UPDATED_NEW",
  };

  return ddb.update(params).promise();
}
async function updateUser({ userId, type, dislikeContents, likeContents }) {
  if (userId != -1) {
    const params = {
      TableName: "Users",
      Key: {
        userId,
      },
      UpdateExpression: `set #like.#type = :likeContents, #dislike.#type = :dislikeContents, updatedAt = :t`,
      ExpressionAttributeNames: {
        "#like": "like",
        "#dislike": "dislike",
        "#type": type,
      },
      ExpressionAttributeValues: {
        ":dislikeContents": dislikeContents,
        ":likeContents": likeContents,
        ":t": new Date().toISOString(),
      },
      ReturnValues: "UPDATED_NEW",
    };

    return ddb.update(params).promise();
  }
}

async function getUser({ userId, type }) {
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
    .then((data) => data.Item);
}
async function getHistory({ userId, historyId }) {
  const params = {
    Key: {
      userId,
      historyId,
    },
    ProjectionExpression: "#like, #dislike",
    ExpressionAttributeNames: {
      "#like": "like",
      "#dislike": "dislike",
    },
    TableName: "History",
  };

  return ddb
    .get(params)
    .promise()
    .then((data) => data.Item);
}
