#!/bin/sh
# 이용약관 페이지 만들기.
# 원문 = terms/terms-of-use.md (앱 저장소 docs/paid-launch-copy-draft.md A절에서 옮긴 글, 2026-11-17). 이 파일만 고치고 이 도구를 다시 실행한다.
# GitHub의 마크다운 변환기(gist 화면과 같은 것)로 본문을 만들어 privacy/index.html의 BODY 표시 사이에 넣는다.
# 실행: sh tools/build-terms.sh   (gh 로그인 필요)
set -e
cd "$(dirname "$0")/.."
body=$(gh api markdown -f mode=gfm -F text=@terms/terms-of-use.md)
python3 - "$body" <<'PY'
import re, sys
body = sys.argv[1]
p = 'terms/index.html'
doc = open(p, encoding='utf-8').read()
new = re.sub(r'(<!-- BODY:START -->).*?(<!-- BODY:END -->)', lambda m: m.group(1) + '\n' + body + '\n' + m.group(2), doc, flags=re.S)
if new == doc and '<!-- BODY:START -->' not in doc:
    sys.exit('BODY 표시가 없습니다')
open(p, 'w', encoding='utf-8').write(new)
print('약관 본문을 채웠습니다')
PY
