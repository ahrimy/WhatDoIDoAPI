const bcrypt = require("bcryptjs");

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context, callback) => {
  const { userId, username, password, gender, age } = event;

// userId 가 없는 경우
  if(!userId){
    return {
      statusCode: 400,
      body: { message: "잘못된 접근입니다." }
    }
  }
  
  try {
    const user = await getUser(userId);
    
    // userId에 해당하는 데이터가 없는 경우
    if(!user.Item){
      return {
        statusCode: 400,
        body: { message: "잘못된 접근입니다." }
      }
    }
    // userId로 조회한 username과 입력받은 username이 다른경우
    if(user.Item.Username !== username){
      return {
        statusCode: 400,
        body: { message: "아이디 중복을 확인해주세요." }
      }
    }
    
    //정상적인 경우
    
    const hash = await bcrypt.hash(password, 8);
    // user 데이터 생성
    const payload = {
      UserId: userId,
      Password: hash,
      Gender: gender,
      Age: age
    };
    const result = await recordUser(userId, payload);

    const response = {
      statusCode: 201,
      body: { message: `${username}님, 가입이 완료되었습니다.` },
    };

    return response;
  } catch (err) {
    errorResponse(err.message, context.awsRequestId, callback);
  }
};

async function getUser(userId) {
  const params = {
    Key: {
     "UserId":userId
    }, 
    ProjectionExpression: "Username",
    TableName: "Users",
  };

  const user = ddb
    .get(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to read item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      }
      return data;
    })
    .promise();

  return user;
}

async function recordUser(userId, data) {
  const params = {
      TableName:"Users",
      Key:{
          "UserId": userId
      },
      UpdateExpression: "set Password = :p, Gender=:g, Age=:a, RequestTime=:t",
      ExpressionAttributeValues:{
          ":p": data.Password,
          ":g": data.Gender,
          ":a": data.Age,
          ":t": new Date().toISOString()
      },
      ReturnValues:"UPDATED_NEW"
  };
  
  return ddb.update(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to read item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      }
      return data;
    })
    .promise();
    
}


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
