# this script generates the problem/person ratings. 
# it needs the results to be in this format: ./data/XXoi.csv where XX is the number of the oi.
# saves the results in ./results.json
# author: tejtex

import pandas as pd
import numpy as np
import os
import logging as log
import json

import re
import requests
from bs4 import BeautifulSoup

log.basicConfig(
    level=log.INFO,
    format="%(asctime)s %(message)s",
    datefmt="%H:%M:%S"
)

# ============= ELO FUNCTIONS ===============
def calculate_elo(input: list[list[float]]) -> tuple[np.ndarray, np.ndarray]:
    
    n = len(input)
    m = len(input[0])
    a = np.zeros(n)
    b = np.zeros(m)
    s = np.array(input, dtype=float)
    s /= 100
    
    sigmoid = lambda x: 1 / (1 + np.exp(-x))
    reg = 0.1
    for epoch in range(100):
        K = 10 * (0.98 ** epoch)
        ba = np.zeros(n)
        ca = np.zeros(n)
        
        bb = np.zeros(m)
        cb = np.zeros(m)
        for i in range(n):
            for j in range(m):
                if np.isnan(s[i][j]):
                    continue
                diff = a[i] - b[j]
                x = diff
                p = sigmoid(x)
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

def get_problems_elo(num: int, center: float | None = None, centerstd: float | None = None) -> tuple[dict[str, float], float, float]:
    

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
    std = a.std()

    b = (b - mean) / std
    if centerstd == None:
        centerstd = std
    if center == None:
        center = mean
    b = b * centerstd + center
    
    
    i = 0
    res = {}
    for name in df.columns:
        if name in ["imię i nazwisko", "suma1", "suma2", "suma3"]:
            continue
        res[str(num) + name] = max(800, int(4000 + 600 *b[i]))
        i += 1
    return res, mean, std


# ============= CALCULATING ELO ===============
res, anchor, anchor2 = get_problems_elo(33)

for i in range(33):
    if os.path.exists(f"data/{i}oi.csv"):
        log.info(f"[calculating] {i}th OI")
        cur, _, _ = get_problems_elo(i, anchor, anchor2)
        res |= cur
        

# ============= SORTING ===============
log.info("[sorting]")
res = dict(sorted(res.items(), key=lambda x: x[1], reverse=True))

# ============ TRANSFORM ==============
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

# ============= ADD DATA ===============
# this part adds data like the url of a problem, its name etc.
# there are a few hardcoded problem names/urls because of naming issues

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

def adddata(items: list[dict]) -> list[dict]:
    index = scrape_index()
    for it in items:
        info = index.get((it["year"], it["stage"], it["code"].rstrip("*")))
        it["name"] = info["name"] if info else HARDCODED[it["code"]]
        it["url"]  = info["url"]  if info else HARDCODED[it["code"]]
    return items
  
data = adddata(res)

with open("../public/results.json", "w") as f:
  json.dump(data, f, indent=2)