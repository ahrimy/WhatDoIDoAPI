import csv
import crawling

with open('final_movie_upload_data.csv', mode='r') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    line_count = 0
    for row in csv_reader:
        idx = row["movie_idx"]
        title = row["content_movietitle"]
        if line_count == 0:
            print(f'Column names are {", ".join(row)}')
            line_count += 1
            continue
        print(f'\t{idx} {title}.')
        line_count += 1
        crawling.search(idx, title)
    print(f'Processed {line_count} lines.')
