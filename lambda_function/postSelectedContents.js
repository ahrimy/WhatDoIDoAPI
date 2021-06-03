/**
 * Lambda: PostSelectedContents
 * 컨텐츠 선택
 */

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const { userId, historyId, selection } = event;

  if (!userId || !historyId) {
    return {
      body: { success: false, message: "userId 또는 historyId가 입력되지 않았습니다." },
    };
  }
  if (!selection || selection.length == 0) {
    return {
      body: { success: false, message: "선택된 컨텐츠가 없습니다." },
    };
  }

  try {
    await updateHistory(userId, historyId, selection);

    const response = {
      body: { success: true },
    };

    return response;
  } catch (err) {
    return {
      body: {
        success: false,
        message: err.message,
      },
    };
  }
};

async function updateHistory(userId, historyId, data) {
  const params = {
    TableName: "History",
    Key: {
      userId,
      historyId,
    },
    UpdateExpression: "set selected = :selectedContents, updatedAt = :t",
    ExpressionAttributeValues: {
      ":selectedContents": data,
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
