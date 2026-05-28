import urllib.request
import json

def run():
    url = "http://127.0.0.1:8000/journal/get-party-list/customer"
    print(f"Sending GET request to {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status Code: {status}")
            print(f"Body: {body[:300]}...")
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} {e.reason}")
        print(f"Read error details: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Other Error: {e}")

if __name__ == "__main__":
    run()
