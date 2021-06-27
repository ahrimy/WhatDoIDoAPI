/**
 * Lambda: RequestUserContentsPreference
 * 컨텐츠 조회 후 api로 컨텐츠 정보 반환
 */

 const axios = require("axios");
 const FormData = require("form-data");
 const AWS = require("aws-sdk");
 const ddb = new AWS.DynamoDB.DocumentClient();
 
 exports.handler = async (event) => {
   try {
     const { userId } = event;
 
     if (!userId) {
       return {
         body: { success: false, message: "userId가 입력되지 않았습니다." },
       };
     }
     const { dislike, like } = await getUser(userId);
     const contentsIdx = [
       {type: "movie", list: like.movie}, 
       {type: "movie", list: dislike.movie}, 
       {type: "book", list: like.book},
       {type: "book", list: dislike.book}
       ];
     const requestContents = contentsIdx.map((item) => {
           const data = new FormData();
           data.append("idx_list", JSON.stringify(item.list));
 
           const config = {
             method: "post",
             url: `http://49.50.173.151:5000/${item.type}`,
             headers: {
               ...data.getHeaders(),
             },
             data: data,
           };
           
           return axios(config);
     });
 
     const contentsList = await Promise.all(requestContents).then(responses => {
       const results = responses.map((response) => {
         return JSON.parse(response.data)
       });
       results[0].forEach(content => {
         content.image = `https://whatdoido.kro.kr/movie/${content.idx}.jpg`
       })
       results[1].forEach(content => {
         content.image = `https://whatdoido.kro.kr/movie/${content.idx}.jpg`
       })
       results[2].forEach(content => {
         content.image = `https://whatdoido.kro.kr/book/${content.idx}.jpg`
       })
       results[3].forEach(content => {
         content.image = `https://whatdoido.kro.kr/book/${content.idx}.jpg`
       })
       return {
         success: true, 
         data: results
       }
     }).catch(function (error) {
           console.log(error);
           throw new Error("컨텐츠 요청 중 에러가 발생하였습니다.");
         });
    
         return {
         body: contentsList,
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
 
 async function getUser(userId) {
   const params = {
     Key: {
       userId: userId,
     },
     ProjectionExpression: "#like, #dislike",
     ExpressionAttributeNames: {
       "#like": "like",
       "#dislike": "dislike"
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
 