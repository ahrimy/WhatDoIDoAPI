# What Do I Do API

산학 프로젝트 **지금 뭐하지?** 프로젝트의 API 개발   
🔗 ~~[지금 뭐하지?](https://whatdoido.kro.kr/)~~

## 🌟 실행 화면
<details>
    <summary><b> 회원 관리 </b></summary>
    <table style="text-align:center;">
      <tbody>
        <tr>
          <td>회원가입</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 40 11 AM" src="https://user-images.githubusercontent.com/26592306/135138045-4b7e6267-35f1-4d3f-8331-732c08f711eb.png">
          </td>
        </tr>
        <tr>
          <td>로그인</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 40 27 AM" src="https://user-images.githubusercontent.com/26592306/135138051-b5a5536a-abad-498e-9907-6dcab2e5cb6d.png">
          </td>
        </tr>
      </tbody>
    </table>
</details>
<details>
    <summary><b> 컨텐츠 추천 </b></summary>
     <table style="text-align:center;">
      <tbody>
        <tr>
          <td>초기 문장 입력</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 44 47 AM" src="https://user-images.githubusercontent.com/26592306/135139019-36cdbcdf-f6a8-44fc-aeff-2edaed829851.png">
          </td>
        </tr>
        <tr>
          <td>목표 문장 입력</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 45 07 AM" src="https://user-images.githubusercontent.com/26592306/135139028-d17d6af8-a864-440d-ab5e-fbcf5ade02cc.png">
          </td>
        </tr>
        <tr>
          <td>대표 컨텐츠 추천</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 45 46 AM" src="https://user-images.githubusercontent.com/26592306/135139031-5ccd2753-7940-4cb3-afc3-f6503608798d.png">
          </td>
        </tr>
        <tr>
          <td>컨텐츠 추천</td>
        </tr>
        <tr>
          <td>
            <img width="900" alt="Screen Shot 2021-09-29 at 2 46 14 AM" src="https://user-images.githubusercontent.com/26592306/135139036-e4811f9a-7d5a-4c76-9192-ade39d007c47.png">
          </td>
        </tr>
      </tbody>
    </table>
</details>
<details>
    <summary><b> 선호도 관리 </b></summary>
    <table style="text-align:center;">
    <tbody>
      <tr>
        <td>컨텐츠 선호도 정보</td>
      </tr>
      <tr>
        <td>
          <img width="900" alt="Screen Shot 2021-09-29 at 2 47 10 AM" src="https://user-images.githubusercontent.com/26592306/135139041-bb5a01d0-2f3e-4a09-88b8-b4914b981983.png">
        </td>
      </tr>
    </tbody>
  </table>
</details>

## 🌐 전체 서비스 구성도
<img width="793" alt="Screen Shot 2021-09-29 at 2 32 51 AM" src="https://user-images.githubusercontent.com/26592306/135137018-1652a900-5636-411a-be13-baa35c24f781.png">

## 📄 Lambda
_각각의 fuction은 AWS Lambda에 업로드_

#### addSentenceData
> DB에 문장 데이터를 저장하기위한 함수
> 
#### checkUsername
> 사용자가 입력한 ID가 사용가능한 아이디인지 확인하는 함수
> 
#### signin
> 사용자가 입력한 아이디와 비밀번호의 일치 여부를 확인하는 함수
> 
#### signup
> 새로운 사용자의 회원가입을 위한 함수
> 
#### postInitSentence
> 사용자가 입력한 문장(init)에 대해 번역->분석->문장 조회의 과정을 거쳐 분석 후에 History 를 생성하는 함수
> 
#### getExampleGoalSentence
> History 의 감정에 따라서 사용자가 공감할 것 같다고 예상되는 예시 문장(goal)들을 반환하는 함수
>  
#### postGoalSentence
> 입력한 goal 문장 분석 후 대표 컨텐츠를 추천해주는 함수
>  
#### postSelectedContents
> 선택한 contents의 idx 를 History에 업데이트 하는 함수
>  
#### requestContentsRecommendation
> 사용자가 추천한 컨텐츠를 기반으로 여러 컨텐츠를 추천해주는 함수 (추천 로직은 외부 API 사용)
> 
#### postContentsPreference
> 사용자가 좋아요/싫어요 선택한 컨텐츠 정보를 저장하는 함수
>
#### deleteContentsPreference
> 사용자가 좋아요/싫어요 선택했던 컨텐츠 정보를 삭제하는 함수
>
#### getUserPreference
> 사용자가 좋아요/싫어요 선택했던 컨텐츠 정보를 조회하는 함수
>
<hr />

### [API Docs 📑](https://documenter.getpostman.com/view/12312893/TzCQbRzB) 
