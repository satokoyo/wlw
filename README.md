# Wonder Deck

Wonder.NET（ワンダーランドウォーズ）のカード編集を1画面で行う、外部JavaScript不要のブックマークレットです。

デッキ・カード一覧・効果を並べて表示し、カードの入れ替えやキャスト切り替え後も編集を続けられます。おすすめカードを先頭表示し、枠ごとの装備制限、装備済みカードの交換、保存前後のデッキ照合に対応しています。

## 導入

リポジトリをダウンロードし、[outputs/install.html](outputs/install.html) をブラウザで開いて登録してください。GitHub上でHTMLのソースが表示される場合は、ダウンロードしたファイルをChromeまたはSafariで開きます。

Wonder.NETにログインし、カード編集画面で登録したブックマークを実行します。

- [使い方・ChromeとSafariの登録手順](outputs/README.md)
- [登録用1行コード](outputs/wonder-deck.bookmarklet.txt)
- [検証結果と未確認事項](outputs/verification.md)

PC版Chromeで実サイトの連続編集を確認しています。スマホ幅に対応していますが、iPhone Safari実機での起動・保存は未確認です。

## 開発

Node.js 18以降で実行できます。標準機能だけを使うため、依存パッケージのインストールは不要です。

```sh
node --test outputs/wonder-deck.test.cjs
node outputs/build.cjs
```

`outputs/wonder-deck.js` が編集用ソースです。ビルドは同じフォルダの実行ソース、登録コード、導入HTMLを更新します。圧縮しない標準ビルドでも単体で動作します。任意の圧縮方法は [outputs/README.md](outputs/README.md) を参照してください。

配布用ファイルもGitで管理します。ソースを修正した場合は、テストとビルドを実行して生成物も一緒にコミットしてください。`work/` は一時作業用で、Gitの管理対象外です。

## 構成

- `outputs/wonder-deck.js`：編集用ソース
- `outputs/wonder-deck.test.cjs`：自動テスト
- `outputs/build.cjs`：登録コード・導入HTMLの生成
- `outputs/install.html`：単体で開ける導入ページ
- `outputs/wonder-deck.bookmarklet.txt`：ブックマーク登録URL
- `outputs/wonder-deck.min.js`：登録URLに含まれる実行ソース
- `outputs/README.md`：利用手順と動作仕様
- `outputs/verification.md`：検証記録

非公式の補助ツールです。カード画像・ゲームデータは ©SEGA に帰属し、このリポジトリには同梱していません。
