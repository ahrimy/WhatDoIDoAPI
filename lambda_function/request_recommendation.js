const randomBytes = require("crypto").randomBytes;
const axios = require("axios");

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
  const { userId, historyId, selection } = event;
  console.log(userId, historyId, selection);

  if (!userId || !historyId) {
    return {
      statusCode: 403,
      body: { message: "잘못된 접근입니다." },
    };
  }

  try {
    //번역
    // axios를 사용해 sentence를 promise로 mapping
    let requests = selection.map((sentence) => analyzeSentence(sentence));

    // Promise.all은 모든 작업이 resolve 될 때까지 대기
    const results = await Promise.all(requests);

    let invalidSentence = [];
    let emotions = [];
    results.forEach((result) => {
      if (result.message) {
        invalidSentence.push(result);
      } else {
        emotions.push(result.emotion);
      }
    });
    if (invalidSentence.length > 0) {
      return {
        statusCode: 200,
        body: { success: false, sentences: invalidSentence },
      };
    }

    const resultsData = results.map(({ sentence, emotion }) => {
      return {
        Sentence: sentence,
        Emotion: {
          Sadness: emotion.sadness,
          Joy: emotion.joy,
          Fear: emotion.fear,
          Disgust: emotion.disgust,
          Anger: emotion.anger,
        },
      };
    });
    await updateHistory(userId, historyId, resultsData);
    const recommendedContents = await recommendContents(userId, historyId, emotions);

    const response = {
      statusCode: 200,
      body: { success: true, contents: recommendedContents },
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
        return { sentence, message: "분석할 수 없는 문장입니다." };
      }

      return { sentence, emotion: analysisResults.result.emotion.document.emotion };
    })
    .catch((err) => {
      if (err.code === 422) {
        return { sentence, message: "문장이 너무 짧아서 분석할 수 없습니다." };
      }
      return { sentence, message: "분석할 수 없는 문장입니다." };
    });
}

async function recommendContents(userId, historyId, emotions) {
  const params = {
    Key: {
      "UserId": userId,
      "HistoryId": historyId,
    },
    ProjectionExpression: "#contentType",
    ExpressionAttributeNames: {
      "#contentType": "Type",
    },
    TableName: "History",
  };

  const type = await ddb
    .get(params)
    .promise()
    .then((data) => data.Item.Type)
    .catch((err) => {
      console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
      throw new Error(err);
    });
  console.log(type);
  if (type == "movie") {
    return [
      {
        contentId: 1,
        title: `Avengers: Endgame`,
        desc: `After the devastating events of Avengers: Infinity War (2018), the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.`,
        img: `https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_UX67_CR0,0,67,98_AL_.jpg`,
      },
      {
        contentId: 2,
        title: `Sound of Metal`,
        desc: `A heavy-metal drummer's life is thrown into freefall when he begins to lose his hearing.`,
        img: `https://m.media-amazon.com/images/M/MV5BNjcyYjg0M2ItMzMyZS00NmM1LTlhZDMtN2MxN2RhNWY4YTkwXkEyXkFqcGdeQXVyNjY1MTg4Mzc@._V1_UX67_CR0,0,67,98_AL_.jpg`,
      },
      {
        contentId: 3,
        title: `The Trial of the Chicago 7`,
        desc: `The story of 7 people on trial stemming from various charges surrounding the uprising at the 1968 Democratic National Convention in Chicago, Illinois.`,
        img: `https://m.media-amazon.com/images/M/MV5BYjYzOGE1MjUtODgyMy00ZDAxLTljYTgtNzk0Njg2YWQwMTZhXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_UX67_CR0,0,67,98_AL_.jpg`,
      },
      {
        contentId: 4,
        title: `Soul`,
        desc: `After landing the gig of a lifetime, a New York jazz pianist suddenly finds himself trapped in a strange land between Earth and the afterlife.`,
        img: `https://m.media-amazon.com/images/M/MV5BZGE1MDg5M2MtNTkyZS00MTY5LTg1YzUtZTlhZmM1Y2EwNmFmXkEyXkFqcGdeQXVyNjA3OTI0MDc@._V1_UX67_CR0,0,67,98_AL_.jpg`,
      },
    ];
  } else {
    return [
      {
        contentId: 1,
        title: `Harry Potter and the Half-Blood Prince`,
        desc: `The war against Voldemort is not going well; even Muggle governments are noticing. Ron scans the obituary pages of the,, looking for familiar names. Dumbledore is absent from Hogwarts for long stretches of time, and the Order of the Phoenix has already suffered losses.,And yet . . .,As in all wars, life goes on. The Weasley twins expand their business. Sixth-yea,The war against Voldemort is not going well; even Muggle governments are noticing. Ron scans the obituary pages of the,, looking for familiar names. Dumbledore is absent from Hogwarts for long stretches of time, and the Order of the Phoenix has already suffered losses.,And yet . . .,As in all wars, life goes on. The Weasley twins expand their business. Sixth-year students learn to Apparate - and lose a few eyebrows in the process. Teenagers flirt and fight and fall in love. Classes are never straightforward, through Harry receives some extraordinary help from the mysterious Half-Blood Prince.,So it's the home front that takes center stage in the multilayered sixth installment of the story of Harry Potter. Here at Hogwarts, Harry will search for the full and complete story of the boy who became Lord Voldemort - and thereby find what may be his only vulnerability.`,
        img: `https://m.media-amazon.com/images/I/51YTdye6YRL._SL160_.jpg`,
      },
      {
        contentId: 2,
        title: `Harry Potter and the Order of the Phoenix`,
        desc: `There is a door at the end of a silent corridor. And it?s haunting Harry Pottter?s dreams. Why else would he be waking in the middle of the night, screaming in terror?,Harry has a lot on his mind for this, his fifth year at Hogwarts: a Defense Against the Dark Arts teacher with a personality like poisoned honey; a big surprise on the Gryffindor Quidditch team; and the loomi,There is a door at the end of a silent corridor. And it?s haunting Harry Pottter?s dreams. Why else would he be waking in the middle of the night, screaming in terror?,Harry has a lot on his mind for this, his fifth year at Hogwarts: a Defense Against the Dark Arts teacher with a personality like poisoned honey; a big surprise on the Gryffindor Quidditch team; and the looming terror of the Ordinary Wizarding Level exams. But all these things pale next to the growing threat of He-Who-Must-Not-Be-Named - a threat that neither the magical government nor the authorities at Hogwarts can stop.,As the grasp of darkness tightens, Harry must discover the true depth and strength of his friends, the importance of boundless loyalty, and the shocking price of unbearable sacrifice.,His fate depends on them all.`,
        img: `https://m.media-amazon.com/images/I/41wjDgOUkXL._SL160_.jpg`,
      },
      {
        contentId: 3,
        title: `Harry Potter and the Sorcerer's Stone`,
        desc: `Harry Potter's life is miserable. His parents are dead and he's stuck with his heartless relatives, who force him to live in a tiny closet under the stairs. But his fortune changes when he receives a letter that tells him the truth about himself: he's a wizard. A mysterious visitor rescues him from his relatives and takes him to his new home, Hogwarts School of Witchcraft,Harry Potter's life is miserable. His parents are dead and he's stuck with his heartless relatives, who force him to live in a tiny closet under the stairs. But his fortune changes when he receives a letter that tells him the truth about himself: he's a wizard. A mysterious visitor rescues him from his relatives and takes him to his new home, Hogwarts School of Witchcraft and Wizardry.,After a lifetime of bottling up his magical powers, Harry finally feels like a normal kid. But even within the Wizarding community, he is special. He is the boy who lived: the only person to have ever survived a killing curse inflicted by the evil Lord Voldemort, who launched a brutal takeover of the Wizarding world, only to vanish after failing to kill Harry.,Though Harry's first year at Hogwarts is the best of his life, not everything is perfect. There is a dangerous secret object hidden within the castle walls, and Harry believes it's his responsibility to prevent it from falling into evil hands. But doing so will bring him into contact with forces more terrifying than he ever could have imagined.,Full of sympathetic characters, wildly imaginative situations, and countless exciting details, the first installment in the series assembles an unforgettable magical world and sets the stage for many high-stakes adventures to come.`,
        img: `https://pictures.abebooks.com/isbn/9780590353403-us.jpg`,
      },
      {
        contentId: 4,
        title: `Harry Potter and the Chamber of Secrets`,
        desc: `The Dursleys were so mean and hideous that summer that all Harry Potter wanted was to get back to the Hogwarts School for Witchcraft and Wizardry. But just as he's packing his bags, Harry receives a warning from a strange, impish creature named Dobby who says that if Harry Potter returns to Hogwarts, disaster will strike.,And strike it does. For in Harry's second year at Ho,The Dursleys were so mean and hideous that summer that all Harry Potter wanted was to get back to the Hogwarts School for Witchcraft and Wizardry. But just as he's packing his bags, Harry receives a warning from a strange, impish creature named Dobby who says that if Harry Potter returns to Hogwarts, disaster will strike.,And strike it does. For in Harry's second year at Hogwarts, fresh torments and horrors arise, including an outrageously stuck-up new professor, Gilderoy Lockhart, a spirit named Moaning Myrtle who haunts the girls' bathroom, and the unwanted attentions of Ron Weasley's younger sister, Ginny. But each of these seem minor annoyances when the real trouble begins, and someone, or something, starts turning Hogwarts students to stone. Could it be Draco Malfoy, a more poisonous rival than ever? Could it possibly be Hagrid, whose mysterious past is finally told? Or could it be the one everyone at Hogwarts most suspects: Harry Potter himself?`,
        img: `https://pictures.abebooks.com/isbn/9780439554893-us.jpg`,
      },
    ];
  }
}

async function updateHistory(userId, historyId, data) {
  const params = {
    TableName: "History",
    Key: {
      UserId: userId,
      HistoryId: historyId,
    },
    UpdateExpression: "set Selected = :selectedSentence, RequestTime = :t",
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
    statusCode: 500,
    body: {
      success: false,
      message: errorMessage,
    },
  });
}
