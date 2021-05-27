import sys
import csv
import get_image

def main(argv):
    skip = int(argv[1])
    with open('final_movie_upload_data.csv', mode='r') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for i in range(0, skip):
            next(csv_reader)
        count = 0
        for row in csv_reader:
            idx = row["movie_idx"]
            title = row["content_movietitle"]
            #if line_count == 0:
            #    print(f'Column names are {", ".join(row)}')
            #    line_count += 1
            #    continue
            print(f'\t{idx} {title}')
            get_image.search(idx, title)
            count += 1
            if count == 50 :
                break;
        print(f'Processed {count} lines.')

if __name__ == "__main__":
    main(sys.argv)
