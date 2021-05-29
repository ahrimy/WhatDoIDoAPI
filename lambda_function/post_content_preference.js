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
      const userPreference = await updateUserPreference({
        userId,
        type,
        isLike,
        contentId,
      });
      const historyPreference = await updateHistoryPreference({
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
    } else {
      await updateHistoryPreference({
        userId,
        historyId,
        type,
        isLike,
        contentId,
      });
    }

    const response = {
      body: { success: true },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, callback);
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
    contentId,
    isLike,
    type,
    dislikeContents,
    likeContents,
  });
}
async function updateHistoryPreference({
  userId,
  historyId,
  type,
  isLike,
  contentId,
}) {
  const preference = await getHistory({ userId, historyId, type });
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
  return updateHistory({
    userId,
    historyId,
    contentId,
    isLike,
    type,
    dislikeContents,
    likeContents,
  });
}

async function updateHistory({
  userId,
  historyId,
  contentId,
  isLike,
  type,
  dislikeContents,
  likeContents,
}) {
  const params = {
    TableName: "History",
    Key: {
      userId,
      historyId,
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

  return ddb
    .update(params)
    .promise()
    .catch((err) => {
      console.error(
        "Unable to update item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
      throw new Error(err);
    });
}
async function updateUser({
  userId,
  contentId,
  isLike,
  type,
  dislikeContents,
  likeContents,
}) {
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

    return ddb
      .update(params)
      .promise()
      .catch((err) => {
        console.error(
          "Unable to update item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
        throw new Error(err);
      });
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

  const result = await ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error(
        "Unable to read item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
      throw new Error(err);
    });
  return result;
}
async function getHistory({ userId, historyId, type }) {
  const params = {
    Key: {
      userId,
      historyId,
    },
    ProjectionExpression: "#like.#contentType, #dislike.#contentType",
    ExpressionAttributeNames: {
      "#like": "like",
      "#dislike": "dislike",
      "#contentType": type,
    },
    TableName: "History",
  };

  const result = await ddb
    .get(params)
    .promise()
    .then((data) => data.Item)
    .catch((err) => {
      console.error(
        "Unable to read item. Error JSON:",
        JSON.stringify(err, null, 2)
      );
      throw new Error(err);
    });
  console.log(result);
  return result;
}

function errorResponse(errorMessage, callback) {
  callback(null, {
    body: {
      success: false,
      message: errorMessage,
    },
  });
}
