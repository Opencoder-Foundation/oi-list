import json
import logging as log
import os
import re
import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup

log.basicConfig(
    level=log.INFO,
    format="%(asctime)s %(message)s",
    datefmt="%H:%M:%S"
)

def calculate_elo(input: list[list[float]]) -> tuple[np.ndarray, np.ndarray]:
    n = len(input)
    m = len(input[0])
    a = np.zeros(n)
    b = np.zeros(m)
    s = np.array(input, dtype=float)
    s /= 100
    
    sigmoid = lambda x: 1 / (1 + np.exp(-x))
    reg = 0.02
    for epoch in range(100):
        K = 10 * (0.98 ** epoch)
        ba = np.zeros(n)
        ca = np.zeros(n)
        
        bb = np.zeros(m)
        cb = np.zeros(m)
        for i in range(n):
            for j in range(m):
                diff = a[i] - b[j]
                x = diff
                p = sigmoid(x)
                if np.isnan(s[i][j]):
                    s[i][j] = 0
                err = p - s[i][j]
                
                ba[i] -= err
                bb[j] += err
                    
                cb[j] += 1
                ca[i] += 1
        ba -= reg * a
        bb -= reg * b
        
        a += np.divide(ba, ca, out=np.zeros_like(ba), where=ca!=0) * K
        b += np.divide(bb, cb, out=np.zeros_like(bb), where=cb!=0) * K
        
        mu = a.mean()
        
        a = (a - mu)
        b = (b - mu)
            
    return a, b

def get_problems_elo(num: int) -> tuple[dict[str, float], dict[str, float]]:
    df = pd.read_csv(f"data/{num}oi.csv")
    prob_cols = [c for c in df.columns if c not in ["imię i nazwisko", "suma1", "suma2", "suma3"]]
    df[prob_cols] = df[prob_cols].apply(pd.to_numeric, errors="coerce")

    input = []
    for i, row in df.iterrows():
        input.append([row[c] for c in df.columns if c not in ["imię i nazwisko", "suma1", "suma2", "suma3"]])
    input = np.array(input)
    a, b = calculate_elo(input)
    a = np.array(a)
    b = np.array(b)
    mean = a.mean()

    b = (b - mean)
    a = (a - mean)
    
    i = 0
    res = {}
    for name in df.columns:
        if name in ["imię i nazwisko", "suma1", "suma2", "suma3"]:
            continue
        res[str(num) + name] = max(800, int(4000 + 600 * b[i]))
        i += 1
        
    people = {}

    for idx, row in df.iterrows():
        people[row["imię i nazwisko"]] = max(
            800,
            int(4000 + 600 * a[idx])
        )   
    return res, people

res, people = get_problems_elo(33)

people_res = []

for name, rating in people.items():
    people_res.append({
        "year": 33,
        "name": name,
        "rating": rating
    })

for i in range(33):
    if os.path.exists(f"data/{i}oi.csv"):
        log.info(f"[calculating] {i}th OI")

        cur, cur_people = get_problems_elo(i)

        res |= cur

        for name, rating in cur_people.items():
            people_res.append({
                "year": i,
                "name": name,
                "rating": rating
            })

log.info("[sorting]")
res = dict(sorted(res.items(), key=lambda x: x[1], reverse=True))

pattern = re.compile(r"^(\d+)([^_]+)_(\d+)e$")

def transform(data: dict) -> list[dict]:
    out = []
    for key, rating in data.items():
        m = pattern.match(key)
        if not m:
            raise ValueError(f"unexpected key format: {key!r}")
        year, code, stage = m.groups()
        out.append({
            "code": code,
            "stage": int(stage),
            "year": int(year),
            "rating": round(rating, -2),
        })
    return out

log.info("[transform]")
res = transform(res)

HARDCODED = {
    "slo":  {"url": "https://szkopul.edu.pl/problemset/problem/2_ADV6xog8RC2Gk3RVQaGQGI/site/", "name": "Zadanie Słowa"},
    "wys":  {"url": "https://szkopul.edu.pl/problemset/problem/wPNHEHvCW-eLTl0dHA35gXfH/site/", "name": "Zadanie Wyspy"},
    "wys*": {"url": "https://szkopul.edu.pl/problemset/problem/KrDYc6Wu8OK_pwfh9EKVkrr7/site/", "name": "Wyspy na trójkątnej sieci"},
    "prz":  {"url": "https://szkopul.edu.pl/problemset/problem/IYh7QVxUYwFMci3pSbYuCgA7/site/", "name": "Przechadzka Bajtusia"},
    "ban":  {"url": "https://szkopul.edu.pl/problemset/problem/hsjAImVbRitFug_CJiZ4Kzdn/site/", "name": "Bankomat"}
}

log.info("[adding more data]")

URL  = "https://szkopul.edu.pl/task_archive/oi/"
BASE = "https://szkopul.edu.pl"

STAGE_RE = re.compile(r"^problemgroups-(\d+)-(e\d+|ioi-elem)$")
CODE_RE  = re.compile(r"\(([^()]+)\)\s*$")

def stage_num(s: str) -> int:
    return 0 if s == "ioi-elem" else int(s[1:])

def scrape_index(url: str = URL) -> dict:
    soup = BeautifulSoup(requests.get(url).text, "html.parser")
    index = {}
    for div in soup.select("div[id]"):
        m = STAGE_RE.match(div["id"])
        if not m:
            continue
        year, stage = m.groups()
        for a in div.select("a[href*='/problemset/problem/']"):
            text = a.get_text(strip=True)
            cm = CODE_RE.search(text)
            code = cm.group(1) if cm else None
            name = text[:cm.start()].strip() if cm else text
            index[(int(year), stage_num(stage), code)] = {
                "name": name,
                "url":  BASE + a["href"],
            }
    return index

def get_omowienie_url(year: int, stage: int, code: str) -> str | None:
    clean_code = code.rstrip("*").lower()
    target_url = f"https://oi.edu.pl/l/oi{year}_{stage}_{clean_code}/"
    
    try:
        r = requests.get(target_url, allow_redirects=True, timeout=5)
        
        if r.status_code == 200:
            content_lower = r.text.lower()
            
            if "organizatorzy" in content_lower:
                return None
            
            return target_url
    except requests.RequestException:
        pass
        
    return None

def adddata(items: list[dict]) -> list[dict]:
    index = scrape_index()
    for it in items:
        info = index.get((it["year"], it["stage"], it["code"].rstrip("*")))
        it["name"]          = info["name"] if info else HARDCODED.get(it["code"], {}).get("name", "")
        it["url"]           = info["url"]  if info else HARDCODED.get(it["code"], {}).get("url", "")
        it["omowienie_url"] = get_omowienie_url(it["year"], it["stage"], it["code"])
    return items

data = adddata(res)

os.makedirs("../backend/data", exist_ok=True)

with open("../backend/data/problems.json", "w") as f:
    json.dump(data, f, indent=2)

with open("../backend/data/people.json", "w") as f:
    json.dump(
        people_res,
        f,
        indent=2,
        ensure_ascii=False
    )