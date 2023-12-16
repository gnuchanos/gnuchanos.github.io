import time

currentTime = time.localtime()


day = currentTime.tm_mday
month = currentTime.tm_mon
year = currentTime.tm_year
print(f"{day}|{month}|{year}")