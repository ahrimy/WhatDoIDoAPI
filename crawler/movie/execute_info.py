import sys
import csv
import get_info

def main(argv):
    skip = int(argv[1])
    with open('final_movie_upload_data.csv', mode='r') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        for i in range(0, skip):
            next(csv_reader)
        count = 0
        new_data = []
        for row in csv_reader:
            idx = row["idx"]
            title = row["title"]
            #if line_count == 0:
            #    print(f'Column names are {", ".join(row)}')
            #    line_count += 1
            #    continue
            print(f'\t{idx} {title}')
            data = get_info.search(title)
            if "title" in data and "description" in data:
                data["idx"] = idx
                data["title"] = f"{data['title']}({title})"
                new_data.append(data)
            count += 1
            if count == 3 :
                break;
        print(f'Processed {count} lines.')
        append(new_data)

def append(data):
    field_names = ['idx','title','description']
    with open('movie_info.csv', 'a+', newline='') as write_obj:
            dict_writer = csv.DictWriter(write_obj, fieldnames=field_names)
            for row in data:
                dict_writer.writerow(row)


if __name__ == "__main__":
    main(sys.argv)
