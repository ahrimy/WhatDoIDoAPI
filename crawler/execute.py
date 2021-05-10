import csv
import crawling

with open('final_book_upload_data.csv', mode='r') as csv_file:
    csv_reader = csv.DictReader(csv_file)
    line_count = 0
    for row in csv_reader:
        idx = row["book_idx"]
        title = row["content_booktitle"]
        author = row["content_author"]
        if line_count == 0:
            print(f'Column names are {", ".join(row)}')
            line_count += 1
        print(f'\t{idx} {title} {author}.')
        line_count += 1
        crawling.search(idx, title, author)
    print(f'Processed {line_count} lines.')
