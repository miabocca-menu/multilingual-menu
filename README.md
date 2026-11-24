# 多言語メニュー & アレルギー情報サイト

日本語・English・简体中文・繁體中文・한국어 の5言語で表示できる、アレルギー情報つきのメニューサイトです。

**公開URL：** https://miabocca-menu.github.io/multilingual-menu/

<img src="qr/qr.png" alt="公開URLのQRコード" width="200">

> ⚠ 掲載している料理・価格・アレルギー情報は **サンプル** です。実際のお店で使う前に、必ず内容を確認して差し替えてください。

## 主な機能
- 言語切替（画面上部のボタン）。選んだ言語は次回も保持されます。
- アレルギー情報：特定原材料8品目（表示義務）＋準ずるもの20品目（推奨）
  - 「含む」と「コンタミの可能性（同じ調理器具・工場で扱う）」を分けて表示
- アレルギー除外フィルタ：食べられないものを選ぶと、該当メニューを **隠す** か **警告を表示** するかを選べます
- ベジタリアン・ヴィーガン・ハラール・辛さの表示
- 全言語で免責文を表示
- 印刷すると A4 の紙メニューになります

## QRコード
| ファイル | 開くページ |
|---|---|
| `qr/qr.png` | 公開URL（スマホの言語設定に合わせて自動表示） |
| `qr/qr-ja.png` | 日本語で開く |
| `qr/qr-en.png` | 英語で開く |
| `qr/qr-zh-Hans.png` | 簡体字中国語で開く |
| `qr/qr-zh-Hant.png` | 繁体字中国語で開く |
| `qr/qr-ko.png` | 韓国語で開く |

## メニューの更新方法
1. `data/menu.json` を開いて料理を追加・修正します。1品は次の形です。
   ```json
   {
     "id": "karaage",
     "category": "main",
     "price": 680,
     "name": { "ja": "鶏の唐揚げ", "en": "Japanese Fried Chicken", "zh-Hans": "日式炸鸡", "zh-Hant": "日式炸雞", "ko": "닭튀김" },
     "desc": { "ja": "説明", "en": "...", "zh-Hans": "...", "zh-Hant": "...", "ko": "..." },
     "allergens": ["wheat", "soy", "chicken"],
     "may_contain": ["egg"],
     "tags": [],
     "spicy": 0
   }
   ```
   - `id`：半角英数字の重複しない名前
   - `category`：`starter`（前菜）/ `main`（メイン）/ `dessert`（デザート）/ `drink`（ドリンク）
   - `allergens`：含むアレルゲン、`may_contain`：コンタミの可能性があるアレルゲン（下の表のキーで書く）
   - `tags`：`vegetarian` / `vegan` / `halal`
   - `spicy`：辛さ 0〜3
   - 翻訳が無い言語は日本語で表示されます
2. 変更を保存して GitHub に push すると、数分で公開ページに反映されます。
   ```
   git add .
   git commit -m "メニュー更新"
   git push
   ```

### アレルゲンのキー
| 区分 | キー（表示名） |
|---|---|
| 表示義務 8品目 | `shrimp`えび `crab`かに `walnut`くるみ `wheat`小麦 `buckwheat`そば `egg`卵 `milk`乳 `peanut`落花生 |
| 推奨 20品目 | `almond`アーモンド `abalone`あわび `squid`いか `salmon_roe`いくら `orange`オレンジ `cashew`カシューナッツ `kiwi`キウイフルーツ `beef`牛肉 `sesame`ごま `salmon`さけ `mackerel`さば `soy`大豆 `chicken`鶏肉 `banana`バナナ `pork`豚肉 `macadamia`マカダミアナッツ `peach`もも `yam`やまいも `apple`りんご `gelatin`ゼラチン |

画面の文言やアレルゲンの各言語の名前は `data/i18n.json` で変更できます。

## 手元で確認する
`fetch` で JSON を読み込むため、HTML をダブルクリックで開くと表示されません。ローカルサーバーを立てて開いてください。
```
python -m http.server 8000
```
→ ブラウザで http://localhost:8000/ を開く

## 構成
```
index.html / style.css / app.js   画面と動作（ビルド不要の静的サイト）
data/menu.json                    料理データ
data/i18n.json                    画面文言・アレルゲン名の翻訳
qr/                               QRコード
```
