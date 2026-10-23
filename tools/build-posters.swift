// 둘러보기 그림 만들기 — 앱스토어 포스터 10장(1284×2778)을 폭 720으로 줄여 AVIF + JPEG(옛 브라우저용 예비)로 저장한다.
// 화면에선 240px 안팎으로 보이므로 720이면 선명한 화면(3배)까지 충분하다. 포스터를 바꾸면 다시 실행한다:
//   swift tools/build-posters.swift
// 원본 = ~/Downloads/포스터 최종본 1284x2778 (앱스토어용) 새 레이아웃/01장.png ~ 10장.png
// 결과 = img/posters/poster-1~10.avif·jpg (index.html의 .gallery가 씀)
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let home = FileManager.default.homeDirectoryForCurrentUser.path
let src = "\(home)/Downloads/포스터 최종본 1284x2778 (앱스토어용) 새 레이아웃"
let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().path + "/img/posters"
try! FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)

func save(_ img: CGImage, _ path: String, _ type: UTType, quality: Double) {
  let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, type.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
  if !CGImageDestinationFinalize(dest) { fatalError("저장 실패: \(path)") }
}

for i in 1...10 {
  let path = "\(src)/" + String(format: "%02d", i) + "장.png"
  guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(s, 0, nil) else { fatalError("원본을 못 읽음: \(path)") }
  let w = 720, h = Int((Double(img.height) * Double(w) / Double(img.width)).rounded())
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  let small = ctx.makeImage()!
  save(small, "\(dir)/poster-\(i).avif", UTType("public.avif")!, quality: 0.8)
  save(small, "\(dir)/poster-\(i).jpg", .jpeg, quality: 0.82)
}
print("완료: 포스터 10장")
