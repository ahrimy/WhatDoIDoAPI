import re
import os
import csv
import boto3

image_base_path ='movie'
s3_bucket_name = 'whatdoido'

s3 = boto3.client('s3')

def get_all_keys(**args):

    # 전체 파일목록(key) 반환용 array
    keys = []

    page_iterator = s3.get_paginator("list_objects_v2")

    for page in page_iterator.paginate(**args):
        try:
            contents = page["Contents"]
        except KeyError:
            break

        for item in contents:
            keys.append(item['Key'])

    return keys


def makeManifest(mypath):
    # s3_bucket_name 버켓의 특정 폴더(mypath)하의 파일들만 가져옴
    entries = get_all_keys(Bucket=s3_bucket_name, Prefix=mypath)
    count = 0
    with open('existing_movie_idx.csv', mode='w') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(['movie_idx'])
        for entry in entries:
            print(entry)
            #이미지만 
            if os.path.splitext(entry)[1].lower() in ('.png','.jpg','.jpeg'):

                ref = '{{"source-ref": "s3://{}/{}"}}'.format(s3_bucket_name,entry)
                y = re.findall('[0-9]+', entry)
                #print(y)
                writer.writerow(y)
                count += 1
    print(len(entries))
    print(count)

if __name__ == "__main__":
     makeManifest(image_base_path)


