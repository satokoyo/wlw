# Wonder Deck

Wonder.NET（ワンダーランドウォーズ）のカード編集を1画面で行う、非公式のブックマークレットです。外部JavaScriptや開発環境は不要です。

## 使う

**[導入ページで登録コードをコピー](https://satokoyo.github.io/wlw/)**

ページ公開前は [登録用コード](dist/wonder-deck.bookmarklet.txt) を開き、GitHubの「Copy raw file」で全文をコピーできます。ダウンロードした `dist/index.html` を直接開く方法も使えます。

1. コピーしたコードをChrome・SafariのブックマークのURLに登録します。
2. Wonder.NETにログインしてカード編集画面を開きます。
3. 登録したブックマークを実行します。

![左にデッキ、中央にカード一覧、右に効果を表示するPC画面](site/assets/deck-desktop.webp)

PC版Chromeでの表示例（v1.1.2）。画像・ゲームデータ ©SEGA。

- デッキ・おすすめ・検索結果・カード効果をまとめて表示
- カード変更やキャスト切り替え後も続けて編集
- 枠の装備制限、装備済みカードの交換、保存前後のサーバー照合
- 左カラムに、そのカードの対応する装備条件を★／☆／？で表示

[使い方](docs/usage.md) · [検証結果と未確認事項](docs/verification.md) · [設計メモ](docs/design-notes.md) · [公開前確認](docs/publication-review.md)

iPhone Safari実機での起動・保存は未確認です。★は対応する装備構成条件の判定で、試合中の全効果の発動を保証する表示ではありません。

## 構成

```text
src/wonder-deck.js              編集するソース
scripts/build.cjs               配布物を生成するスクリプト
tests/wonder-deck.test.cjs       Node.js標準テスト
site/index.template.html        導入ページのテンプレート
site/assets/                    掲載用の画面キャプチャ
dist/                          コミット済み配布物・Pages配信対象
docs/                          操作手順・設計・検証記録
.github/workflows/pages.yml     Pages配信設定
```

`dist/`は生成物です。ソースやテンプレートを変更してから再生成してください。`work/`、認証情報、APIの生データ、依存環境は配布対象に含めません。

## ビルド・テスト

Node.js 18以降を使い、リポジトリ直下で実行します。標準ビルドに追加パッケージは必要ありません。

```sh
node scripts/build.cjs
node --test tests/wonder-deck.test.cjs
```

標準ビルドはソースをそのまま登録コードへ変換します。既存のPlaywrightに含まれるBabel bundleがある場合のみ、`node scripts/build.cjs /path/to/playwright/lib/transform/babelBundle.js` で空白・コメントを削減できます。この任意機能はPlaywright内部APIに依存します。圧縮ツールがない場合も標準ビルドを利用できます。`dist/wonder-deck.min.js` は登録コードの実体で、標準ビルドでは非圧縮です。

画面キャプチャは導入HTML内に埋め込みます。画像用の外部通信や追加配信設定は不要です。ブックマークレットのサイズには影響しません。

## GitHub Pagesで公開する

1. 公開範囲とプランを確認します。GitHub Freeでは公開リポジトリが必要です。リポジトリを公開するとソースと履歴も閲覧可能になります。
2. Settings → Pages → Source を **GitHub Actions** にします。
3. Actions → **Publish installation page** を実行します。
4. `https://satokoyo.github.io/wlw/` を確認します。

以降は `main` の配布物などの変更でテストと公開処理が実行されます。Pagesには `dist/` だけを配信します。現在の設定状態はGitHubのSettingsとActionsで確認してください。

SourcetreeのOAuth認証に `workflow` 権限がない場合、ワークフローの追加・変更はGitHubのWeb画面で行い、ローカルへpullします。本体の通常更新に権限追加は不要です。

[GitHub Pages公式手順](https://docs.github.com/en/pages/quickstart)

## 通信・権利表記

ブックマークレットのAPI通信先はWonder.NETの同一オリジンです。ログイン中のセッションを使い、カード変更キーは実行中に取得します。認証情報の固定埋め込み、外部解析サービス、外部カードDBはありません。

本ツールはSEGA公式ではありません。ゲーム名・カード画像・ゲームデータなどの権利は各権利者に帰属します。掲載キャプチャは操作説明用です。第三者素材の再利用権を許諾するものではありません。ソースコードの再配布ライセンスはまだ指定していません。公開リポジトリであることを包括的な利用許諾と解釈しないでください。
