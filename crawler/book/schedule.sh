#!/bin/sh

cd /home/ubuntu/WhatDoIDoAPI/crawler/book
cnt=$(cat count)
echo start $cnt
if [ "$cnt" -lt 140 ];then
	skip=$(($cnt*50+1))
#	mkdir images
	python3 execute.py $skip

	cnt=$(($cnt+1))
	echo $cnt > count
#	rm -rf images
fi
echo done
