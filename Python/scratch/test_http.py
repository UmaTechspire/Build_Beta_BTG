import urllib.request
import urllib.error

def run():
    url = "http://127.0.0.1:8000/AR/getARBook"
    print(f"Requesting {url} with a 5-second timeout...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"Status Code: {response.getcode()}")
            body = response.read().decode('utf-8')
            print(f"Response: {body[:300]}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.reason}")
        try:
            print(f"Details: {e.read().decode('utf-8')}")
        except Exception:
            pass
    except Exception as e:
        print(f"Other Error: {type(e)} - {e}")

if __name__ == "__main__":
    run()
