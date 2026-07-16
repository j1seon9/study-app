"""
합성 "모의고사(학평) 성적표" 문서 이미지 생성기.

실제 학생 성적표는 개인정보이므로 학습 데이터로 쓸 수 없다 (프로젝트의
privacy-minimized/AI 개인정보 정책 방침과 동일한 이유). 대신 실제 전국연합학력평가
성적통지표(학생용) 양식을 참고하여 구조를 최대한 사실적으로 재현한 "가짜" 문서를
무한히 생성하고, 그걸 clean target으로 써서 degrade.py로 열화시켜 학습쌍을 만든다.

실제 양식 구성 (사용자 제공 참고자료 기준):
  1) 상단 정보 박스: 시도/학교명/학년/반/번호/성명/성별/실시일
  2) 영역별 표: 국어/수학(상대평가: 표준점수/백분위/석차/등급 + 등급별 전국 인원수)
                영어/한국사/탐구(절대평가: "원점수에 의한 등급" 텍스트만 표시)
  3) 영역별 세부영역 표: 국어/수학/영어 각각 세부영역·배점·득점·전국평균
  4) 보충 학습이 필요한 문항 번호 표 + 기타 참고자료
  5) 문항별 정답표: 문항번호별 O/X(정답여부) + A~E(정답률 등급)

주의: 실제 문서에 있는 "빨간 설명 박스"(상대평가 vs 절대평가 해설 등)는 촬영 대상
원본 문서에는 없는, 참고자료 작성자가 나중에 추가한 주석이므로 재현하지 않는다.
OCR 전처리 모델이 실제로 마주칠 대상은 어디까지나 순수 성적표 인쇄물이다.
"""

from __future__ import annotations

import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "C:/Windows/Fonts/malgun.ttf",
    "C:/Windows/Fonts/malgunbd.ttf",
    "C:/Windows/Fonts/NanumGothic.ttf",
    "C:/Windows/Fonts/NanumGothicBold.ttf",
]

# 실제 문서 원본 해상도로 그린 뒤, 요청받은 (width, height)로 리사이즈해서 반환한다.
# (학습 시 dataset.py가 다양한 크기를 요청하므로, 다소 종횡비가 눌리는 것은
#  카메라 왜곡과 비슷한 효과로 보고 허용한다.)
NATIVE_WIDTH = 1900
NATIVE_HEIGHT = 1420

SOCIAL_SUBJECTS = ["생활과 윤리", "사회문화", "한국지리", "정치와 법"]
SCIENCE_SUBJECTS = ["물리학I", "화학I", "생명과학I", "지구과학I"]

_FONT_CACHE: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}


def _resolve_font_path(bold: bool) -> str | None:
    preferred = FONT_CANDIDATES[1] if bold else FONT_CANDIDATES[0]
    for path in (preferred, *FONT_CANDIDATES):
        try:
            ImageFont.truetype(path, 12)
            return path
        except OSError:
            continue
    return None


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    key = (size, bold)
    if key not in _FONT_CACHE:
        path = _resolve_font_path(bold)
        if path is None:
            _FONT_CACHE[key] = ImageFont.load_default()
        else:
            _FONT_CACHE[key] = ImageFont.truetype(path, size, index=0)
    return _FONT_CACHE[key]


def _cell(draw, rect, text="", font=None, align="center", fill=(0, 0, 0), border=(0, 0, 0)):
    """rect(x0,y0,x1,y1)에 테두리를 그리고 텍스트를 정렬해 넣는 공용 헬퍼."""
    x0, y0, x1, y1 = rect
    if border is not None:
        draw.rectangle(rect, outline=border, width=1)
    if text:
        font = font or _font(13)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if align == "center":
            tx = x0 + ((x1 - x0) - tw) / 2 - bbox[0]
        elif align == "right":
            tx = x1 - tw - 6 - bbox[0]
        else:
            tx = x0 + 6 - bbox[0]
        ty = y0 + ((y1 - y0) - th) / 2 - bbox[1]
        draw.text((tx, ty), text, font=font, fill=fill)


def _draw_header(draw, x0, y0, width) -> int:
    """상단 정보 박스. 이름/학교 등은 전부 placeholder 값으로 채운다."""
    box_h = 90
    title_w = 260
    draw.rectangle((x0, y0, x0 + title_w, y0 + box_h), outline=(0, 0, 0), width=1)
    grade_label = random.choice(["고1", "고2", "고3"])
    month_label = random.choice(["3월", "6월", "9월", "11월"])
    year_label = random.choice(["2023", "2024", "2025", "2026"])
    draw.text(
        (x0 + 10, y0 + 12),
        f"{year_label}학년 {month_label} {grade_label} 전국연합학력평가",
        font=_font(14, bold=True),
        fill=(0, 0, 0),
    )
    draw.text((x0 + 10, y0 + 45), "성적통지표 (학생용)", font=_font(15, bold=True), fill=(0, 0, 0))

    fields = [
        ("시·도", "서울시"),
        ("학교명", random.choice(["내일고", "한빛고", "은성고", "대성고"]) + "등학교"),
        ("학교번호", str(random.randint(1000, 9999))),
        ("학년", str(random.randint(1, 3))),
        ("반", str(random.randint(1, 10))),
        ("번호", str(random.randint(1, 30))),
        ("성명", "홍길동"),  # placeholder, 실제 개인정보 아님
        ("성별", random.choice(["남", "여"])),
        ("실시일", f"{random.randint(2023,2026)}.{random.randint(1,12):02d}.{random.randint(1,28):02d}"),
    ]
    n = len(fields)
    col_w = (width - title_w) / n
    x = x0 + title_w
    for label, value in fields:
        _cell(draw, (x, y0, x + col_w, y0 + box_h / 2), label, font=_font(13, bold=True))
        _cell(draw, (x, y0 + box_h / 2, x + col_w, y0 + box_h), value, font=_font(13))
        x += col_w

    return int(y0 + box_h)


def _fake_grade_counts(total: int) -> list[tuple[int, float]]:
    """1~9등급 전국 인원수(비율%)를 대략 정규분포스럽게 만들어낸다 (통계적 정확성보다 시각적 사실성 목적)."""
    weights = [random.uniform(0.05, 0.12) for _ in range(9)]
    s = sum(weights)
    weights = [w / s for w in weights]
    counts = [int(total * w) for w in weights]
    pcts = [round(c / total * 100, 2) for c in counts]
    return list(zip(counts, pcts))


def _draw_main_table(draw, x0, y0, width) -> int:
    col_w = {
        "group": 45,
        "name": 95,
        "raw": 105,
        "std": 130,
        "class_rank": 90,
        "school_rank": 90,
        "pct": 90,
        "grade": 60,
        "n": 100,
    }
    grade_col_w = (width - sum(col_w.values())) / 9
    row_h = 40
    header_h = 40

    x_positions = [x0]
    for key in ["group", "name", "raw", "std", "class_rank", "school_rank", "pct", "grade", "n"]:
        x_positions.append(x_positions[-1] + col_w[key])
    for _ in range(9):
        x_positions.append(x_positions[-1] + grade_col_w)

    headers = ["영역", "", "원점수", "표준점수", "학급석차", "학교석차", "전국백분위", "등급", "응시자수"] + [
        f"{i}등급" for i in range(1, 10)
    ]
    y = y0
    for i, h in enumerate(headers):
        _cell(draw, (x_positions[i], y, x_positions[i + 1], y + header_h), h, font=_font(12, bold=True))
    y += header_h

    subjects_relative = ["국어", "수학"]
    subjects_absolute = ["영어", "한국사"]
    social = random.choice(SOCIAL_SUBJECTS)
    science = random.choice(SCIENCE_SUBJECTS)

    rows = []
    for name in subjects_relative:
        raw_max = 100
        raw_score = random.randint(70, 100)
        std_score = random.randint(110, 145)
        grade = random.choice([1, 1, 2, 2, 3])
        rows.append(
            {
                "group": "",
                "name": name,
                "relative": True,
                "raw": f"{raw_max}/{raw_score}",
                "std": f"0~200/{std_score}",
                "class_rank": f"{random.randint(1,5)}/{random.randint(20,30)}",
                "school_rank": f"{random.randint(1,50)}/{random.randint(200,260)}",
                "pct": f"{random.uniform(80,99.9):.2f}",
                "grade": str(grade),
                "n": str(random.randint(370000, 375000)),
            }
        )
    for name in subjects_absolute:
        rows.append(
            {
                "group": "",
                "name": name,
                "relative": False,
                "raw": f"{100 if name=='영어' else 50}/{random.randint(70,100)}",
                "abs_grade": random.randint(1, 5),
                "n": str(random.randint(370000, 375000)),
            }
        )
    rows.append(
        {
            "group": "탐구",
            "name": social,
            "relative": False,
            "raw": f"50/{random.randint(30,50)}",
            "abs_grade": random.randint(1, 9),
            "n": str(random.randint(365000, 372000)),
        }
    )
    rows.append(
        {
            "group": "",
            "name": science,
            "relative": False,
            "raw": f"50/{random.randint(30,50)}",
            "abs_grade": random.randint(1, 9),
            "n": str(random.randint(365000, 372000)),
        }
    )

    for r in rows:
        _cell(draw, (x_positions[0], y, x_positions[1], y + row_h), r["group"], font=_font(12, bold=True))
        _cell(draw, (x_positions[1], y, x_positions[2], y + row_h), r["name"], font=_font(13, bold=True))
        _cell(draw, (x_positions[2], y, x_positions[3], y + row_h), r["raw"], font=_font(12))

        if r["relative"]:
            _cell(draw, (x_positions[3], y, x_positions[4], y + row_h), r["std"], font=_font(12))
            _cell(draw, (x_positions[4], y, x_positions[5], y + row_h), r["class_rank"], font=_font(12))
            _cell(draw, (x_positions[5], y, x_positions[6], y + row_h), r["school_rank"], font=_font(12))
            _cell(draw, (x_positions[6], y, x_positions[7], y + row_h), r["pct"], font=_font(12), fill=(180, 0, 0))
            _cell(draw, (x_positions[7], y, x_positions[8], y + row_h), r["grade"], font=_font(13, bold=True), fill=(180, 0, 0))
            total = int(r["n"])
            counts = _fake_grade_counts(total)
            for i, (c, p) in enumerate(counts):
                gx0, gx1 = x_positions[9 + i], x_positions[10 + i]
                _cell(draw, (gx0, y, gx1, y + row_h / 2), str(c), font=_font(10))
                _cell(draw, (gx0, y + row_h / 2, gx1, y + row_h), f"({p:.2f})", font=_font(9))
        else:
            merged_rect = (x_positions[3], y, x_positions[8], y + row_h)
            _cell(draw, merged_rect, f"원점수에 의한 등급 ({r['abs_grade']})", font=_font(12))
            for i in range(9):
                gx0, gx1 = x_positions[9 + i], x_positions[10 + i]
                _cell(draw, (gx0, y, gx1, y + row_h), "", border=(0, 0, 0))

        _cell(draw, (x_positions[8], y, x_positions[9], y + row_h), r["n"], font=_font(11))
        y += row_h

    draw.rectangle((x0, y0, x_positions[-1], y), outline=(0, 0, 0), width=2)
    return int(y)


def _draw_detail_table(draw, x0, y0, w, h, title, rows) -> None:
    """세부영역 | 배점 | 득점 | 전국평균 형식의 작은 표."""
    draw.text((x0, y0 - 20), title, font=_font(13, bold=True), fill=(0, 0, 0))
    col_w = [w * 0.4, w * 0.2, w * 0.2, w * 0.2]
    headers = ["세부영역", "배점", "득점", "전국평균"]
    row_h = (h) / (len(rows) + 1)
    x = x0
    xs = [x0]
    for cw in col_w:
        x += cw
        xs.append(x)
    y = y0
    for i, hh in enumerate(headers):
        _cell(draw, (xs[i], y, xs[i + 1], y + row_h), hh, font=_font(11, bold=True))
    y += row_h
    for r in rows:
        for i, v in enumerate(r):
            _cell(draw, (xs[i], y, xs[i + 1], y + row_h), str(v), font=_font(11))
        y += row_h


def _draw_supplement_and_reference(draw, x0, y0, w, h) -> None:
    subj_items = [
        ("국어", ", ".join(str(random.randint(1, 45)) for _ in range(random.randint(2, 4)))),
        ("수학", ", ".join(str(random.randint(1, 30)) for _ in range(random.randint(2, 4)))),
        ("영어", ", ".join(str(random.randint(1, 25)) for _ in range(random.randint(2, 4)))),
        ("한국사", str(random.randint(1, 20))),
        ("사회", "-"),
        ("과학", ", ".join(str(random.randint(1, 20)) for _ in range(random.randint(1, 3)))),
    ]
    draw.text((x0, y0 - 20), "보충 학습이 필요한 문항 번호", font=_font(13, bold=True), fill=(0, 0, 0))
    col_w = [w * 0.3, w * 0.7]
    row_h = h / len(subj_items)
    xs = [x0, x0 + col_w[0], x0 + w]
    y = y0
    for name, items in subj_items:
        _cell(draw, (xs[0], y, xs[1], y + row_h), name, font=_font(11, bold=True))
        _cell(draw, (xs[1], y, xs[2], y + row_h), items, font=_font(10), align="left")
        y += row_h


def _draw_answer_grid(draw, x0, y0, width, subject_blocks) -> int:
    """문항별 정답표: 과목마다 [문항번호 헤더 / O,X 정답여부 / A~E 등급] 3줄."""
    label_w = 110
    y = y0
    for subject, n_items in subject_blocks:
        max_items_width = width - label_w
        cell_w = min(34, max_items_width / n_items)
        row_h = 24

        _cell(draw, (x0, y, x0 + label_w, y + row_h * 2), subject, font=_font(13, bold=True))
        x = x0 + label_w
        for q in range(1, n_items + 1):
            is_wrong = random.random() < 0.08
            mark = "X" if is_wrong else "O"
            fill = (180, 0, 0) if is_wrong else (0, 0, 0)
            _cell(draw, (x, y, x + cell_w, y + row_h), mark, font=_font(10), fill=fill)
            grade_letter = random.choices("ABCDE", weights=[30, 30, 20, 12, 8])[0]
            _cell(draw, (x, y + row_h, x + cell_w, y + row_h * 2), grade_letter, font=_font(10))
            x += cell_w
        y += row_h * 2 + 10
    return int(y)


def generate_score_report(width: int = 1900, height: int = 1420, seed: int | None = None) -> np.ndarray:
    """
    실제 전국연합학력평가 성적통지표 양식을 재현한 합성 문서를 생성해
    BGR uint8 numpy 배열로 반환한다 (요청한 width x height로 리사이즈됨).
    """
    if seed is not None:
        random.seed(seed)

    img = Image.new("RGB", (NATIVE_WIDTH, NATIVE_HEIGHT), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    margin = 30
    x0 = margin
    y = margin

    y = _draw_header(draw, x0, y, NATIVE_WIDTH - 2 * margin)
    y += 20
    y = _draw_main_table(draw, x0, y, NATIVE_WIDTH - 2 * margin)
    y += 40

    detail_w = (NATIVE_WIDTH - 2 * margin - 2 * 20) / 3
    detail_h = 170
    korean_rows = [
        (n, random.randint(5, 30), random.randint(3, 30), round(random.uniform(3, 25), 2))
        for n in ["어휘개념", "사실적 이해", "추론적 이해", "비판적 이해", "적용·창의"]
    ]
    math_rows = [
        (n, random.randint(10, 47), random.randint(3, 47), round(random.uniform(3, 27), 2))
        for n in ["계산", "이해", "추론", "문제해결"]
    ]
    english_rows = [
        (n, random.randint(12, 25), random.randint(3, 25), round(random.uniform(3, 22), 2))
        for n in ["듣기", "말하기", "읽기", "쓰기"]
    ]
    _draw_detail_table(draw, x0, y + 20, detail_w, detail_h, "국어 영역", korean_rows)
    _draw_detail_table(draw, x0 + detail_w + 20, y + 20, detail_w, detail_h, "수학 영역", math_rows)
    _draw_detail_table(draw, x0 + 2 * (detail_w + 20), y + 20, detail_w, detail_h, "영어 영역", english_rows)

    y += 20 + detail_h + 40
    _draw_supplement_and_reference(draw, x0, y + 20, NATIVE_WIDTH - 2 * margin, 130)

    y += 20 + 130 + 30
    subject_blocks = [("국어", 45), ("수학", 30), ("영어", 25), ("한국사", 20), ("사회", 20), ("과학", 20)]
    y = _draw_answer_grid(draw, x0, y, NATIVE_WIDTH - 2 * margin, subject_blocks)

    note_font = _font(13)
    draw.text(
        (x0, min(y + 15, NATIVE_HEIGHT - 30)),
        "※ 본 성적표는 학습 참고용으로만 사용하시기 바랍니다.",
        font=note_font,
        fill=(80, 80, 80),
    )

    arr = np.array(img)[:, :, ::-1].copy()  # RGB -> BGR
    if (width, height) != (NATIVE_WIDTH, NATIVE_HEIGHT):
        import cv2

        arr = cv2.resize(arr, (width, height), interpolation=cv2.INTER_AREA)
    return arr


if __name__ == "__main__":
    doc = generate_score_report(seed=1)
    print("generated doc shape:", doc.shape, doc.dtype)
