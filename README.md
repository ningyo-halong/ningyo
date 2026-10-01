# Không gian Văn hoá Nhật Bản — trang thuyết minh hiện vật
# 日本文化空間 — 人形展示の解説ページ

共有いいね機能の設定・検証方法: [docs/likes.md](docs/likes.md)

43体の人形ページ（ベトナム語＋日本語）と、タグに貼るQRコードです。

## 中身
- `index.html` … 一覧ページ
- `01.html` 〜 `43.html` … 人形ごとのページ（番号はExcelのNo.と同じ）
- `img/` … 写真（01.jpg 〜 43.jpg）
- `qr/` … タグに貼るQRコード（qr-01.png 〜 qr-43.png）
- `style.css` … デザイン

## GitHub Pagesで公開する手順
1. GitHubで新しいリポジトリを作る。名前は `ningyo`、Public。
2. このフォルダの中身を全部アップロードする（Add file → Upload files → フォルダごとドラッグ）。
3. Settings → Pages → Build and deployment の Source を「Deploy from a branch」、Branch を `main` / `(root)` にして Save。
4. 1〜2分待つと公開される。URLは
   `https://nihonbunka-halong.github.io/ningyo/`

## QRコードのリンク先
今のQRコードは次のURLを指しています。

    https://nihonbunka-halong.github.io/ningyo/01.html  …  /43.html

リポジトリ名やユーザー名を変える場合は、QRコードを作り直す必要があります（タグを印刷する前に決めてください）。

## 直したいとき
- 文章：`01.html` 〜 `43.html` の中の文章を直して、アップロードし直す。
- 写真：`img/` の同じファイル名で差し替える。QRコードはそのままで大丈夫。

## タグと同じ表示順（2026年9月29日）

一覧・ページ内の表示番号・前後の移動は、完成版の展示タグと同じ順番です。No.41はアマビエです。

既存のQRコードを使い続けられるよう、HTMLと写真のファイル名は元のExcelのNo.を維持しています。表示番号とURL中の番号は異なります。ファイルを表示番号に合わせて改名しないでください。

| タグの表示番号 | 固定ページURL | 人形名 |
| --- | --- | --- |
| 1 | [16.html](16.html) | 道成寺 |
| 2 | [22.html](22.html) | きぬずれ |
| 3 | [28.html](28.html) | 神武帝 |
| 4 | [17.html](17.html) | 藤娘 |
| 5 | [18.html](18.html) | 花嫁 |
| 6 | [12.html](12.html) | 舞 |
| 7 | [25.html](25.html) | 翁 |
| 8 | [26.html](26.html) | 助六 |
| 9 | [15.html](15.html) | 初詣で |
| 10 | [13.html](13.html) | 七枚笠 |
| 11 | [21.html](21.html) | 春の宵 |
| 12 | [14.html](14.html) | 六段の調べ |
| 13 | [23.html](23.html) | 韻 |
| 14 | [24.html](24.html) | 花筺 |
| 15 | [19.html](19.html) | 京人形 |
| 16 | [20.html](20.html) | 京人形 |
| 17 | [27.html](27.html) | 若殿 |
| 18 | [29.html](29.html) | ひねもす |
| 19 | [30.html](30.html) | おるすばん |
| 20 | [31.html](31.html) | 身支度 |
| 21 | [32.html](32.html) | 這い這い人形 |
| 22 | [42.html](42.html) | こま回し |
| 23 | [39.html](39.html) | 子とろ |
| 24 | [33.html](33.html) | 市松人形（男） |
| 25 | [34.html](34.html) | 市松人形（女） |
| 26 | [35.html](35.html) | お座り人形 |
| 27 | [36.html](36.html) | 宮様人形 |
| 28 | [37.html](37.html) | 御所人形 破邪の剣 |
| 29 | [38.html](38.html) | 御所人形 面持ち |
| 30 | [40.html](40.html) | いづくら（男） |
| 31 | [41.html](41.html) | いづくら（女） |
| 32 | [43.html](43.html) | 華姿 |
| 33 | [03.html](03.html) | 弥生 |
| 34 | [02.html](02.html) | 萌芽 |
| 35 | [04.html](04.html) | 童女 |
| 36 | [10.html](10.html) | ベトナム創作こけし |
| 37 | [11.html](11.html) | ベトナム創作こけし |
| 38 | [08.html](08.html) | 津軽系 大型こけし |
| 39 | [09.html](09.html) | 津軽系 大型こけし |
| 40 | [07.html](07.html) | 津軽系 中型こけし |
| 41 | [01.html](01.html) | アマビエ |
| 42 | [06.html](06.html) | 静心 |
| 43 | [05.html](05.html) | 花園 |
