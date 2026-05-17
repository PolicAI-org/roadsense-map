import sys
import json
from random import randint

def mockup_process(csv_data):
    result = ''
    i = 0
    random_quality = str(randint(1, 3))
    for line in csv_data:
        split = line.split(",")
        if len(split) > 9:
            result += split[7] + "," + split[8] + "," + random_quality + '\n'
        i += 1
        if i % 400 == 0:
            random_quality = str(randint(1, 3))
        if i == 100000:
            break

    return result

def process_file(file_path: str) -> dict:
    with open(file_path, 'r') as f:
        content = f.readlines()

    return mockup_process(content)

if __name__ == '__main__':
    print("script started", file=sys.stderr)
    file_path = sys.argv[1]
    print(f"file path: {file_path}", file=sys.stderr)
    result = process_file(file_path)
    print(f"result length: {len(result)}", file=sys.stderr)
    print(result)