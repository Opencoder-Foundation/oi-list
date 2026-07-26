import requests
import pandas as pd
import os
from unidecode import unidecode

from functools import reduce

DROP = {"kl.", "Lp.", "wojewodztwo", "miejscowść", "miejsce", "klasa", "klaza", "nazwa szkoły", "miejscowość", "województwo", "imię", "nazwisko", "szkoła", "miasto", "miejscowość szkoły", "lp.", "l.p.", "lp", "Unnamed: 12", "nazwa"}
def flatten_columns(cols):
    if not isinstance(cols, pd.MultiIndex):
        return list(cols)
    flat = []
    for tup in cols:
        parts = [str(x).strip() for x in tup if not str(x).startswith("Unnamed")]
        flat.append(parts[-1] if parts else str(tup[-1]))
    return flat
def fetch_oi(num: int, etap: int, base: str) -> pd.DataFrame:
    url = base.format(num=num, etap=etap)
    res = pd.read_html(url)
    res = pd.concat(res, ignore_index=True)
    res.columns = flatten_columns(res.columns)

    if "imię" in res.columns:
        res = res[res["imię"].notna() & res["nazwisko"].notna()] 
        res["imię i nazwisko"] = (res["imię"] + " " + res["nazwisko"]).apply(unidecode)
    else:
        res = res[res["imię i nazwisko"].notna()]
        res["imię i nazwisko"] = res["imię i nazwisko"].apply(unidecode)
    

    res.columns = [c.strip() for c in res.columns]
    res = res[[c for c in res.columns if c not in DROP]]
    for col in res.columns:
        if col != "imię i nazwisko":
            res[col] = pd.to_numeric(res[col], errors="coerce").astype("float64")
    res.fillna(0, inplace=True)
    res = res.rename(columns={"suma": f"suma{etap}"})
    res = res.rename(columns={"Suma": f"suma{etap}"})
    res = res.rename(columns={
        c: f"{c}_{etap}e"
        for c in res.columns
        if c not in ("imię i nazwisko", f"suma{etap}")
    })
    return res

def fetch_year(num: int, base: str) -> pd.DataFrame:
    dfs = []
    
    for etap in range(1, 4):
        try:
            if num == 33 and etap == 2:
                df1 = fetch_oi(num, etap, "https://oi.edu.pl/l/{num}oi_finalisci")
                df2 = fetch_oi(num, etap, "https://oi.edu.pl/l/{num}oi_2etap_wyroznienia")
                df = (
                    df1.set_index("imię i nazwisko")
                        .combine_first(df2.set_index("imię i nazwisko"))
                        .reset_index()
                )
            else:
                df = fetch_oi(num, etap, base)
        except Exception as e:
            print(f"{num}oi {etap}etap: {e}")
            continue
        dfs.append(df)

    if not dfs:
        return pd.DataFrame()


    reduced =  reduce(
        lambda l, r: l.merge(r, on="imię i nazwisko", how="outer"),
        dfs,
    )
    cols = ["imię i nazwisko"] + [c for c in reduced.columns if c != "imię i nazwisko"]
    return reduced[cols]
for i in range(11, 34):
    if os.path.exists(f"data/{i}oi.csv"): continue
    os.makedirs(f"data/", exist_ok=True)
    df = fetch_year(i, "https://oi.edu.pl/l/{num}oi_{etap}etap_wyniki")
    print(df.columns)
    df.to_csv(f"data/{i}oi.csv", index=False)