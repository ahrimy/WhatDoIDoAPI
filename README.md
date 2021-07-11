# What Do I Do API

산학 프로젝트 **지금 뭐하지?** 프로젝트의 API 개발   
🔗 ~~[지금 뭐하지?](https://whatdoido.kro.kr/)~~

## Lambda
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
