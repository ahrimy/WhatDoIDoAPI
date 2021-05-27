import sys
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
import time
import urllib.request
#import boto3

def search(title):
    options = webdriver.ChromeOptions()
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--ignore-ssl-errors')
    options.add_argument('--headless')
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    driver = webdriver.Chrome(executable_path='/home/ubuntu/chromedriver', options=options)
    driver.get("https://www.google.co.kr")

    elem = driver.find_element_by_name("q")
    elem.send_keys(f"movie {title}") # 검색어
    elem.send_keys(Keys.RETURN)
    try:
        time.sleep(2)
        title = driver.find_element_by_xpath('/html/body/div[7]/div/div[9]/div[2]/div/div/div[2]/div[2]/div/div/div/div[2]/h2/span').get_attribute("innerHTML") # 이건 언제 바뀔지 모름
        description = driver.find_element_by_xpath('/html/body/div[7]/div/div[9]/div[2]/div/div/div[2]/div[5]/div/div/div/div[1]/div/div/div[2]/div/div[3]/div/div/div/span').get_attribute("innerHTML") # 이건 언제 바뀔지 모름
        print(f"{title} ,  {description}")
    except Exception as err:
        #print("\terror")
        print(f"\t{err}")
        pass

    driver.close()

if __name__ == "__main__":
    search(sys.argv)
