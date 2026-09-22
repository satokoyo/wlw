# Wonder Deck

Wonder.NET（ワンダーランドウォーズ）のカード編集を1画面で行う、外部JavaScript不要のブックマークレットです。

デッキ・カード一覧・効果を並べて表示し、カードの入れ替えやキャスト切り替え後も編集を続けられます。おすすめを先頭の専用欄に表示し、同じカードを通常一覧にも表示します。カテゴリタブ、レベル・レアリティ順の一覧、未所持・情報不足カードの選択禁止、枠ごとの装備制限、装備済みカードの交換、保存前後のデッキ照合に対応しています。

## 導入

**[導入ページを開く → 登録コードをコピー](https://satokoyo.github.io/wlw/)**

クローンや開発環境は不要です。ページの「登録コードをコピー」を押して、Chrome・SafariのブックマークのURLに貼り付けてください。PCではドラッグでの登録もできます。

> 上記URLはGitHub Pages公開後に利用できます。公開準備中やページが開かない場合は、[登録用コード](outputs/wonder-deck.bookmarklet.txt)を開き、GitHubの「Copy raw file」から全文をコピーしてください。ダウンロード済みの `outputs/install.html` を直接開く方法も使えます。

Wonder.NETにログインし、カード編集画面で登録したブックマークを実行します。

- [使い方・ChromeとSafariの登録手順](outputs/README.md)
- [登録用1行コード](outputs/wonder-deck.bookmarklet.txt)
- [検証結果と未確認事項](outputs/verification.md)
- [CDN検討・表示設計](outputs/design-notes.md)

PC版Chromeで実サイトの連続編集を確認しています。スマホ幅に対応していますが、iPhone Safari実機での起動・保存は未確認です。

## 開発

Node.js 18以降で実行できます。標準機能だけを使うため、依存パッケージのインストールは不要です。

```sh
node outputs/build.cjs
node --test outputs/wonder-deck.test.cjs
```

`outputs/wonder-deck.js` が編集用ソースです。ビルドは同じフォルダの実行ソース、登録コード、導入HTMLを更新します。`outputs/install.template.html` が導入ページのテンプレートです。圧縮しない標準ビルドでも単体で動作します。任意の圧縮方法は [outputs/README.md](outputs/README.md) を参照してください。

配布用ファイルもGitで管理します。ソースを修正した場合は、テストとビルドを実行して生成物も一緒にコミットしてください。`work/` は一時作業用で、Gitの管理対象外です。

## 公開するには（管理者向け）

1. このリポジトリをGitHubへpushします。
2. GitHubの Settings → Pages → Build and deployment → Source を **GitHub Actions** にします。
3. Actionsの **Publish installation page** を実行します。以降は `main` の配布ファイル更新時に自動公開します。
4. `https://satokoyo.github.io/wlw/` でコピー・登録手順を確認します。

ワークフローはコミット済みの導入HTML・1行コード・ソースだけを配信します。テスト用データやローカル作業フォルダは配信しません。ページ側でカード情報やアカウント情報を取得する処理もありません。

[GitHub Pages公式手順](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)に沿った設定です。別アカウントへforkする場合は、READMEと導入テンプレートの公開先URLを変更してから再ビルドしてください。

## 構成

- `outputs/wonder-deck.js`：編集用ソース
- `outputs/wonder-deck.test.cjs`：自動テスト
- `outputs/build.cjs`：登録コード・導入HTMLの生成
- `outputs/install.html`：公開用・単体で開ける導入ページ
- `outputs/install.template.html`：導入ページの編集用テンプレート
- `.github/workflows/pages.yml`：GitHub Pagesへの配信設定
- `outputs/wonder-deck.bookmarklet.txt`：ブックマーク登録URL
- `outputs/wonder-deck.min.js`：登録URLに含まれる実行ソース
- `outputs/README.md`：利用手順と動作仕様
- `outputs/verification.md`：検証記録

非公式の補助ツールです。カード画像・ゲームデータは ©SEGA に帰属し、このリポジトリには同梱していません。
