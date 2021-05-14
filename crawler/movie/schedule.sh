#!/bin/sh

cd /home/ubuntu/WhatDoIDoAPI/crawler/movie
cnt=$(cat count)
echo start $cnt

skip=$(($cnt*50))
mkdir images
python3 execute.py $skip

cnt=$(($cnt+1))
echo $cnt > count
rm -rf images
echo done
