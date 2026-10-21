// 웹사이트 그림 만들기 — 원본 그림을 웹용 크기로 줄여 AVIF(가벼운 형식) + JPEG(옛 브라우저용 예비)로 저장한다.
// 그림을 바꾸거나 더하면 아래 목록만 고치고 다시 실행한다:
//   swift tools/build-images.swift
// 원본 위치(기본값):
//   GPT 그림   = ~/Downloads/인드웰 웹사이트 그림 재료/GPT가 만든 그림 (여기에 저장)/<번호>.png
//   실제 앱 화면 = ~/Downloads/인드웰 웹사이트 그림 재료/실제 앱 화면/<이름>.png
//   표지       = ~/dev/Indwell/src/assets/journal/  (앱 원본, 읽기만 함)
//   일기 사진   = ~/Downloads/인드웰 웹사이트 그림 재료/일기 사진 (오래앉아 있던 날).png  (일기장에 붙인 사진)
import AppKit
import ImageIO
import UniformTypeIdentifiers

let home = FileManager.default.homeDirectoryForCurrentUser.path
let gptDir = "\(home)/Downloads/인드웰 웹사이트 그림 재료/GPT가 만든 그림 (여기에 저장)"
let appShotDir = "\(home)/Downloads/인드웰 웹사이트 그림 재료/실제 앱 화면"
let coverDir = "\(home)/dev/Indwell/src/assets/journal"
let diaryPhoto = "\(home)/Downloads/인드웰 웹사이트 그림 재료/일기 사진 (오래앉아 있던 날).png"
let site = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().path
let oat = CGColor(srgbRed: 0xEF / 255.0, green: 0xE3 / 255.0, blue: 0xD6 / 255.0, alpha: 1)  // 바탕색 --oat

// 장면 그림: (GPT 번호, 웹 이름). 이름 앞 숫자 = GPT 번호. -p = 휴대폰 세로판.
let landscape: [(Int, String)] = [
  (1, "01-paper-morning"), (9, "09-nib"),
  (24, "24-postits-six"), (10, "10-postit-one"), (11, "11-postit-paper"), (3, "03-book-open"), (12, "12-book-closed"),
  (13, "13-shelving"), (4, "04-library"), (14, "14-library-full"), (27, "27-review-spring"), (28, "28-review-winter"),
  (15, "15-letter-folded"), (5, "05-letter-afternoon"), (6, "06-letter-evening"),
  (25, "25-diary-closed"), (26, "26-diary-open"),
  (7, "07-paper-night"), (17, "17-arch-night"),
]
let portrait: [(Int, String)] = [
  (8, "08-paper-morning-p"), (22, "22-book-open-p"), (23, "23-book-closed-p"),
  (30, "30-review-spring-p"), (31, "31-review-winter-p"),
  (21, "21-letter-folded-p"), (19, "19-letter-afternoon-p"), (20, "20-letter-evening-p"),
  (29, "29-diary-open-p"), (18, "18-paper-night-p"),
]
let appShots: [(String, String)] = [
  ("01_책상", "desk"), ("02_작성창", "writing"), ("03_서재", "library"),
  ("04a_독후감 목록", "review-list"), ("04b_독후감 데미안 1·2차", "review-book"),
  ("05a_돌아온 글 (서재)", "returned-shelf"), ("05b_돌아온 글 (팝업)", "returned-popup"),
  ("06a_일기장 (돌아온 일기·달력)", "journal-home"), ("06b_일기 쓰기", "journal-entry"),
]

func load(_ path: String) -> CGImage {
  guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("원본을 못 읽음: \(path)") }
  return img
}

// 폭 w로 줄임(작으면 그대로). flatten = 투명한 곳을 바탕색으로 채움(JPEG용)
func resized(_ img: CGImage, width w: Int, flatten: Bool = false) -> CGImage {
  let tw = min(w, img.width), th = Int((Double(img.height) * Double(tw) / Double(img.width)).rounded())
  let ctx = CGContext(data: nil, width: tw, height: th, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  if flatten { ctx.setFillColor(oat); ctx.fill(CGRect(x: 0, y: 0, width: tw, height: th)) }
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: tw, height: th))
  return ctx.makeImage()!
}

func save(_ img: CGImage, _ path: String, _ type: UTType, quality: Double) {
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, type.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
  if !CGImageDestinationFinalize(dest) { fatalError("저장 실패: \(path)") }
}

func out(_ dir: String) -> String {
  let p = "\(site)/img/\(dir)"
  try! FileManager.default.createDirectory(atPath: p, withIntermediateDirectories: true)
  return p
}

let avif = UTType("public.avif")!
let scenes = out("scenes"), app = out("app"), covers = out("covers")

// 가로 그림: 1536(넓은 화면·휴대폰 자르기용) + 960(작은 창) AVIF, 1536 JPEG 예비
for (n, name) in landscape {
  let img = load("\(gptDir)/\(n).png")
  save(resized(img, width: 1536), "\(scenes)/\(name)-1536.avif", avif, quality: 0.82)
  save(resized(img, width: 960), "\(scenes)/\(name)-960.avif", avif, quality: 0.82)
  save(resized(img, width: 1536, flatten: true), "\(scenes)/\(name).jpg", .jpeg, quality: 0.8)
}
// 세로 그림: 1024 AVIF + 1024 JPEG 예비
for (n, name) in portrait {
  let img = load("\(gptDir)/\(n).png")
  save(resized(img, width: 1024), "\(scenes)/\(name)-1024.avif", avif, quality: 0.82)
  save(resized(img, width: 1024, flatten: true), "\(scenes)/\(name).jpg", .jpeg, quality: 0.8)
}
// 실제 앱 화면: 폭 900 (휴대폰 틀 안에서 선명하게)
for (file, name) in appShots {
  let img = load("\(appShotDir)/\(file).png")
  save(resized(img, width: 900), "\(app)/\(name).avif", avif, quality: 0.8)
  save(resized(img, width: 900, flatten: true), "\(app)/\(name).jpg", .jpeg, quality: 0.82)
}
// 앱 표지: 일기장 9 + 독후감 4, 폭 480 (일기장은 모서리가 투명 → AVIF는 투명 유지, JPEG는 바탕색으로 채움)
for i in 1...9 {
  let img = load("\(coverDir)/diary_0\(i).png")
  save(resized(img, width: 480), "\(covers)/diary-\(i).avif", avif, quality: 0.8)
  save(resized(img, width: 480, flatten: true), "\(covers)/diary-\(i).jpg", .jpeg, quality: 0.82)
}
for i in 1...4 {
  let img = load("\(coverDir)/review_0\(i).jpg")
  save(resized(img, width: 480), "\(covers)/review-\(i).avif", avif, quality: 0.8)
  save(resized(img, width: 480, flatten: true), "\(covers)/review-\(i).jpg", .jpeg, quality: 0.82)
}
// 일기장에 붙인 사진: 폭 800
do {
  let img = load(diaryPhoto)
  save(resized(img, width: 800), "\(scenes)/diary-photo.avif", avif, quality: 0.8)
  save(resized(img, width: 800, flatten: true), "\(scenes)/diary-photo.jpg", .jpeg, quality: 0.82)
}
print("완료: 장면 \(landscape.count + portrait.count) · 앱 화면 \(appShots.count) · 표지 13")
