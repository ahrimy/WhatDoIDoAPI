import sys
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time
import urllib.request
#import boto3

def search(title_en):
    options = webdriver.ChromeOptions()
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--ignore-ssl-errors')
    options.add_argument('--headless')
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    driver = webdriver.Chrome(executable_path='/home/ahrimy/chromedriver', options=options)
    
    driver.get("https://www.google.co.kr")

    elem = driver.find_element_by_name("q")
    elem.send_keys(f"movie {title_en} 줄거리") # 검색어
    elem.send_keys(Keys.RETURN)
    data = {}
    try:
        # time.sleep(60)
        b = driver.find_element(By.CLASS_NAME, 'GzssTd')
        title = b.find_element(By.TAG_NAME, 'span').get_attribute("innerHTML") 
        c = driver.find_element(By.CSS_SELECTOR, '.Z0LcW.XcVN5d')
        description = c.get_attribute("innerHTML") 
        print(f"{title} ,  {description}")
        data = {"title": title, "description": description}
    except Exception as err:
        print(f"\t{err}")
        pass

    driver.close()
    return data

if __name__ == "__main__":
    search(sys.argv[1])
