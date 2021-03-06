from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
import urllib.request
#import boto3

def search(idx, title):
    options = webdriver.ChromeOptions()
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--ignore-ssl-errors')
    options.add_argument('--headless')
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    driver = webdriver.Chrome(executable_path='/home/ahrimy/chromedriver', options=options)
    driver.get("https://www.google.co.kr/imghp?hl=ko&tab=wi&authuser=0&ogbl")

    elem = driver.find_element_by_name("q")
    elem.send_keys(f"movie poster {title}") # 검색어
    elem.send_keys(Keys.RETURN)


    # 전체 데이터 봐야할때 필요 
    # 지금은 첫번째 이미지만 가져오기 때문에 없어도됨
    # SCROLL_PAUSE_TIME = 1
    # Get scroll height
    # last_height = driver.execute_script("return document.body.scrollHeight")
    # while True:
    #     # Scroll down to bottom
    #     driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    #     # Wait to load page
    #     time.sleep(SCROLL_PAUSE_TIME)
    #     # Calculate new scroll height and compare with last scroll height
    #     new_height = driver.execute_script("return document.body.scrollHeight")
    #     if new_height == last_height:
    #         try:
    #             driver.find_element_by_css_selector(".mye4qd").click()
    #         except:
    #             break
    #     last_height = new_height

    images = driver.find_elements_by_css_selector(".rg_i.Q4LuWd")
    isSaved = False
    for image in images:
        try:
            image.click()
            time.sleep(2)
            imgUrl = driver.find_element_by_xpath('/html/body/div[2]/c-wiz/div[3]/div[2]/div[3]/div/div/div[3]/div[2]/c-wiz/div/div[1]/div[1]/div/div[2]/a/img').get_attribute("src") # 이건 언제 바뀔지 모름
            
            urllib.request.urlretrieve(imgUrl, f"images/{idx}.jpg")
            isSaved = True
            #data = open(f"images/{idx}.jpg", "rb")
            #s3 = boto3.resource('s3', region_name='ap-northeast-2')
            #s3.Bucket("whatdoido").put_object(Key=f"movies/{idx}.jpg", Body=data, ContentType="image/jpg")
        except Exception as err:
            #print("\terror")
            print(f"\t{err}")
            pass
        if isSaved:
            break

    driver.close()
