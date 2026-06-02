import urllib.request
import json

url = "http://localhost:8000/procurement/GetGRNsByPO?poid=2787"
try:
    with urllib.request.urlopen(url) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
