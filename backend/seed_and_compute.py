import argparse
import sys
import time
import urllib.request
import urllib.error
import json


def request(method, url, data=None):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        return e.code, {"error": body}
    except urllib.error.URLError as e:
        return None, {"error": str(e.reason)}


def main():
    parser = argparse.ArgumentParser(description="Seed demo data and trigger backend computations")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000",
                        help="Backend Flask base URL (default: http://127.0.0.1:5000)")
    parser.add_argument("--student-id", default="9491b299-0ee0-46ff-8d7e-78bddaf8808d",
                        help="Student UUID (default: 9491b299-0ee0-46ff-8d7e-78bddaf8808d)")
    parser.add_argument("--course-codes", nargs="*", default=["COMP2171", "ELET3460"],
                        help="Course codes to predict grades for (default: COMP2171 ELET3460)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    sid = args.student_id

    print("=" * 60)
    print(f"  Studious — Seed & Compute Pipeline")
    print(f"  Backend: {base}")
    print(f"  Student: {sid}")
    print("=" * 60)

    def ok(s): return s is not None and 200 <= s < 300

    # ── 1. Recalculate KDE peak focus windows ──────────────────────────
    print("\n[1/4] Recalculating KDE peak focus windows ...")
    status, payload = request("GET", f"{base}/api/focus-sessions/{sid}/peaks")
    if ok(status):
        windows = payload.get("windows", [])
        print(f"       ✓ {len(windows)} peak windows found")
    else:
        print(f"       ✗ {payload.get('error', payload)}")
        if status and status < 500:
            print("       (non-fatal, continuing)")

    # ── 2. Full sync (grade predictions + KDE + study hours) ──────────
    print("\n[2/4] Running full sync (grades, KDE, study hours) ...")
    status, payload = request("POST", f"{base}/api/sync/{sid}/run")
    if ok(status):
        print(f"       ✓ Sync complete")
    else:
        print(f"       ✗ {payload.get('error', payload)}")
        if status and status < 500:
            print("       (non-fatal, continuing)")

    # ── 3. Predict & save grades per course ───────────────────────────
    print(f"\n[3/4] Predicting grades for {len(args.course_codes)} course(s) ...")
    for code in args.course_codes:
        status, payload = request("POST", f"{base}/api/course-grades/{sid}/{code}/predict")
        if ok(status):
            grade = payload.get("predicted_grade", "?")
            print(f"       ✓ {code}: predicted grade = {grade}")
        else:
            print(f"       ✗ {code}: {payload.get('error', payload)}")

    # ── 4. Verify peaks were stored ───────────────────────────────────
    print("\n[4/4] Verifying peak focus windows ...")
    status, payload = request("GET", f"{base}/api/focus-sessions/{sid}/peaks")
    if ok(status):
        windows = payload.get("windows", [])
        print(f"       ✓ {len(windows)} peak windows now stored")
        for w in windows:
            print(f"         peak_theta={w.get('peak_theta', '?'):.4f}  "
                  f"density={w.get('peak_density', '?'):.3f}")
    else:
        print(f"       ✗ {payload.get('error', payload)}")

    print("\n" + "=" * 60)
    print("  Demo data is ready. You can now present the app.")
    print("=" * 60)


if __name__ == "__main__":
    main()
