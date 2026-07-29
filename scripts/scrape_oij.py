import pandas as pd
import os
import requests
import camelot
from unidecode import unidecode
from functools import reduce

def normalize_name(name: str) -> str:
    name = unidecode(str(name)).strip().lower()
    parts = name.split()
    if len(parts) > 2:
        name = parts[0] + " " + parts[-1]
    return name

DROP = {
    "kl.",
    "Lp.",
    "lp.",
    "l.p.",
    "lp",
    "wojewodztwo",
    "województwo",
    "miejscowść",
    "miejscowość",
    "miejsce",
    "klasa",
    "klaza",
    "nazwa szkoły",
    "szkoła",
    "szkola",
    "miasto",
    "miejscowość szkoły",
    "imię",
    "nazwisko",
    "Unnamed: 12",
    "nazwa",
    "#",
    "test",
    "imię I nazwisko",
    "",
    "tura testowa"
}

def flatten_columns(cols):
    if not isinstance(cols, pd.MultiIndex):
        return list(cols)
    flat = []
    for tup in cols:
        parts = [
            str(x).strip()
            for x in tup
            if not str(x).startswith("Unnamed")
        ]
        flat.append(
            parts[-1] if parts else str(tup[-1])
        )
    return flat

def clean_result(res, etap):
    res.columns = [
        str(c).strip()
        for c in res.columns
    ]
    res = res.loc[:, ~res.columns.duplicated()]

    if "imię" in res.columns:
        res = res[
            res["imię"].notna()
            &
            res["nazwisko"].notna()
        ]
        res["imię i nazwisko"] = (
            res["imię"].astype(str)
            + " "
            + res["nazwisko"].astype(str)
        ).apply(normalize_name)

    elif "imię I nazwisko" in res.columns:
        res = res[
            res["imię I nazwisko"].notna()
        ]
        res["imię i nazwisko"] = (
            res["imię I nazwisko"]
            .apply(normalize_name)
        )

    elif "imię i nazwisko" in res.columns:
        res = res[
            res["imię i nazwisko"].notna()
        ]
        res["imię i nazwisko"] = (
            res["imię i nazwisko"]
            .apply(normalize_name)
        )
    else:
        raise Exception(
            "cannot find name column"
        )

    res = res[
        [
            c
            for c in res.columns
            if c not in DROP
        ]
    ]

    for col in res.columns:
        if col != "imię i nazwisko":
            res[col] = pd.to_numeric(
                res[col],
                errors="coerce"
            ).astype("float64")

    res.fillna(
        0,
        inplace=True
    )

    res = res.rename(
        columns={
            "suma": f"suma{etap}",
            "Suma": f"suma{etap}",
        }
    )
    
    res = res[[c for c in res.columns if c.find('*') == -1]]

    res = res.rename(
        columns={
            c: f"{c}_{etap}e"
            for c in res.columns
            if c not in (
                "imię i nazwisko",
                f"suma{etap}"
            )
        }
    )

    # remove rows without name
    res = res[
        res["imię i nazwisko"].notna()
        & res["imię i nazwisko"].astype(str).str.strip().ne("")
        & ~res["imię i nazwisko"].astype(str).str.lower().isin(
            ["nan", "none"]
        )
    ]

    return res
    return res

def fetch_oij_html(year: int, etap: int):
    url = (
        f"https://oij.edu.pl/"
        f"oij{year}/etap{etap}/wyniki"
    )
    tables = pd.read_html(url)
    res = pd.concat(
        tables,
        ignore_index=True
    )
    res.columns = flatten_columns(
        res.columns
    )
    return clean_result(
        res,
        etap
    )
def fetch_oij_pdf(year: int, etap: int):

    url = (
        f"https://oij.edu.pl/"
        f"oij{year}/etap{etap}/wyniki.pdf"
    )

    pdf = f"oij{year}_{etap}.pdf"

    r = requests.get(url)

    if r.status_code != 200:
        raise Exception("pdf not found")

    with open(pdf, "wb") as f:
        f.write(r.content)


    try:
        tables = camelot.read_pdf(
            pdf,
            pages="all",
            flavor="stream",
            row_tol=10
        )


        if len(tables) == 0:
            raise Exception("no tables")


        dfs = []

        for table in tables:
            df = table.df

            # remove empty rows
            df = df[
                ~(
                    df.astype(str)
                    .apply(
                        lambda x: x.str.strip().eq("").all(),
                        axis=1
                    )
                )
            ]

            dfs.append(df)


        res = pd.concat(
            dfs,
            ignore_index=True
        )


        # find header row
        header_row = None

        for i, row in res.iterrows():

            text = " ".join(
              [
                  str(x)
                  for x in row.tolist()
                  if pd.notna(x)
              ]
            ).lower()

            if (
                "imię" in text
                and "nazwisko" in text
            ):
                header_row = i
                break


        if header_row is None:
            raise Exception(
                "header missing"
            )


        res.columns = [
            str(x).strip().lower()
            for x in res.iloc[header_row]
        ]

        res = res.iloc[
            header_row + 1:
        ].reset_index(drop=True)


        # remove repeated headers from next pages
        res = res[
            res["imię"].astype(str).str.lower()
            != "imię"
        ]


        return clean_result(
            res,
            etap
        )


    finally:
        import gc
        gc.collect()

        try:
            os.remove(pdf)
        except:
            pass

def fetch_oij(year: int, etap: int):
    if year >= 19:
        return fetch_oij_html(
            year,
            etap
        )
    return fetch_oij_pdf(
        year,
        etap
    )

def fetch_year(year: int):
    dfs = []

    for etap in range(1, 4):
        try:
            df = fetch_oij(
                year,
                etap
            )
        except Exception as e:
            print(
                f"{year}oij {etap}etap: {e}"
            )
            continue

        dfs.append(df)

    if not dfs:
        return pd.DataFrame()

    reduced = reduce(
        lambda l, r:
            l.merge(
                r,
                on="imię i nazwisko",
                how="outer"
            ),
        dfs
    )

    cols = [
        "imię i nazwisko"
    ] + [
        c
        for c in reduced.columns
        if c != "imię i nazwisko"
    ]

    return reduced[cols]

os.makedirs(
    "data/",
    exist_ok=True
)
os.makedirs(
    "../backend/data/results/",
    exist_ok=True
)

for i in range(14, 21):
    if os.path.exists(
        f"data/{i}oij.csv"
    ):
        continue

    df = fetch_year(i)

    print(
        f"OIJ{i}:",
        df.shape
    )
    print(
        df.columns
    )

    df.to_csv(
        f"data/{i}oij.csv",
        index=False
    )

    df.to_csv(
        f"../backend/data/results/{i}oij.csv",
        index=False
    )