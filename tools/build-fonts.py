# 제목 서체 만들기 — 앱의 마루부리에서 index.html에 쓰인 글자만 잘라 가벼운 웹 서체(woff2)로 만든다.
# ★ index.html의 문구를 고치면 반드시 다시 실행한다. 안 하면 새로 생긴 글자만 다른 서체(본명조)로 보인다.
#   python3 tools/build-fonts.py
# 필요: fonttools·brotli (python3 -m pip install --user fonttools brotli)
# 원본: ~/dev/Indwell/assets/fonts/MaruBuri-*.otf (앱 원본, 읽기만 함)
#
# 이름: 마루부리 사용 허락서(SIL OFL 1.1)의 '보호 이름(Reserved Font Name) MaruBuri' 조항 때문에
# 잘라 낸 서체는 MaruBuri라는 이름을 쓸 수 없다 → 서체 이름을 'Indwell Title'로 바꾼다.
# 저작권 표시(이름표 0번)와 허락서 안내(13·14번)는 그대로 둔다. 허락서 전문은 fonts/MaruBuri-OFL.txt.
import html, os, re, shutil
from fontTools import subset
from fontTools.ttLib import TTFont

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser("~/dev/Indwell/assets/fonts")
OUT = os.path.join(SITE, "fonts")
FAMILY = "Indwell Title"

# 1) 페이지 글자 모으기 — 사용 설명서 구역(본명조로 보임)·스크립트·모양 규칙은 빼고, 태그를 걷어낸 글자만.
#    (화면에 보이는 글은 모두 index.html에 둔다. site.js가 글을 새로 만들어 넣으면 여기서 못 모은다.)
page = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
page = re.sub(r"<!-- GUIDE:START -->.*?<!-- GUIDE:END -->", " ", page, flags=re.S)
page = re.sub(r"<(script|style)\b.*?</\1>", " ", page, flags=re.S | re.I)
text = html.unescape(re.sub(r"<[^>]+>", " ", page))
# 기본으로 늘 넣는 글자: 영문·숫자·문장부호(문구에 없어도 시각·날짜 표시 등에 쓰일 수 있음)
base = "".join(chr(c) for c in range(0x20, 0x7F)) + "‘’“”·…—–→←↑↓「」『』〈〉《》·°"
chars = sorted(set(text + base) - set("\n\r\t"))
hangul = sum(1 for c in chars if "가" <= c <= "힣")

# 2) 굵기마다 잘라 내기
os.makedirs(OUT, exist_ok=True)
for weight, style in (("Regular", "regular"), ("Bold", "bold")):
    font = TTFont(os.path.join(SRC, f"MaruBuri-{weight}.otf"))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(chars))
    sub.subset(font)
    name = font["name"]
    for rec in list(name.names):
        if rec.nameID in (1, 16):
            rec.string = FAMILY
        elif rec.nameID in (4,):
            rec.string = f"{FAMILY} {weight}"
        elif rec.nameID in (3, 6):
            rec.string = f"IndwellTitle-{weight}"
    out = os.path.join(OUT, f"indwell-title-{style}.woff2")
    font.flavor = "woff2"
    font.save(out)
    print(f"{os.path.basename(out)}: {os.path.getsize(out) // 1024}KB")

shutil.copyfile(os.path.join(SRC, "MaruBuri-OFL.txt"), os.path.join(OUT, "MaruBuri-OFL.txt"))
print(f"글자 {len(chars)}개 (한글 {hangul}자)")
