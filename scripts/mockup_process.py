import sys
from random import randint

def mockup_process(csv_data):
    """
    Če ni funkcij za predprocesiranje in klasifikacijo se lahko ta uporabi za generiranje naključnih podatkov.
    """
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

if __name__ == '__main__':
    file_path = sys.argv[1]
    with open(file_path, 'r') as f:
        content = f.readlines()
    result = mockup_process(content)
    print(result)