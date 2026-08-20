# ASN.1 Instance Builder から DER Builder への再構築計画

## 1. 文書の目的

この文書は、`pkistudio/asn1instancebuilder` の機能を `pkistudio/derbuilder` として作り直すための要件と開発計画を定義する。

実装上の基準は `pkistudio/x509gadgets` とし、次の要素を同じ方針へそろえる。

- リポジトリの外形、公開エントリーポイント、ドキュメント構成
- 公開済み `@pkistudio/dereditor` npm パッケージの取り込み境界
- TypeScript、Vite、テスト、GitHub Pages、GitHub Release、npm 公開のワークフロー
- ローカル完結、依存関係の固定、CI によるポリシー検証

この文書の作成時点では、アプリケーションコード、設定、ワークフローの実装は行わない。`docs/refs` 配下の計画書だけを成果物とする。

## 2. 参照ベースライン

調査日は 2026-08-20 UTC とし、以下のコミットをベースラインとする。

| 用途 | 参照先 | コミット | 採用する内容 |
| --- | --- | --- | --- |
| リポジトリと運用の正本 | [`pkistudio/x509gadgets`](https://github.com/pkistudio/x509gadgets/tree/15329e1f98f856b8f9ff8b52624d9d9cce0b4fca) | `15329e1f98f856b8f9ff8b52624d9d9cce0b4fca` | 構成、DerEditor 境界、CI、E2E、Pages、Release、npm 公開、依存ポリシー |
| 機能移植元 | [`pkistudio/asn1instancebuilder`](https://github.com/pkistudio/asn1instancebuilder/tree/6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3) | `6ed3d620bf5ab7bffbb557dd9fe065daaf3788b3` | ASN.1 パーサー、Schema Model、診断、DER 生成、Definition Bundle、UI Profile、NamedObjects、ブラウザー UI |
| 旧機能の説明資料 | [`asn1instancebuilder` Wiki](https://github.com/pkistudio/asn1instancebuilder/wiki) | `7eddd65a87184070797b0b46ff681a8d648f6046` | 利用フロー、入力モデル、既知の制限、埋め込み API |

参照間で競合する場合は、次の優先順位を適用する。

1. リポジトリ構成、依存関係、検証・公開手順は `x509gadgets` を優先する。
2. ASN.1 入力、診断、DER 生成、Definition Bundle、UI Profile の振る舞いは旧 `asn1instancebuilder` の実装とテストを優先する。
3. Wiki と実装が異なる場合は、テストで確認できる実装を現行挙動とみなす。
4. DER Builder で意図的に変更する項目は、この文書で明記する。

## 3. 再構築の基本方針

### 3.1 製品と公開名

- 製品名を **DER Builder** とする。
- GitHub リポジトリを `pkistudio/derbuilder` とする。
- npm パッケージを `@pkistudio/derbuilder` とする。
- GitHub Pages の公開先を `https://pkistudio.github.io/derbuilder/` とする。
- コード上の公開名は `DerBuilder`、`initDerBuilder`、`DER_BUILDER_VERSION` のように統一する。
- CSS、DOM id、ローカル保存キーの接頭辞は `derbuilder` または短縮形 `derb` に統一し、`asn1ib` を新規公開面へ残さない。
- 旧 `@pkistudio/asn1instancebuilder` の互換エイリアスは初期スコープに含めない。必要になった場合は別の互換性計画で扱う。

### 3.2 再利用と再実装の境界

- 旧実装の機能とテストケースを移植元として利用するが、旧リポジトリ構造、旧ワークフロー、旧 PkiStudioJS 連携をそのまま複製しない。
- `@pkistudio/pkistudiojs` は使用しない。
- DerEditor のソース、静的ファイル、内部パス、Git リポジトリをコピーまたは直接参照しない。
- 他の PkiStudio リポジトリを submodule、Git dependency、workspace link、CI checkout で取り込まない。
- PkiStudio スコープの実行時依存は、公開済みで完全固定した `@pkistudio/dereditor` だけにする。
- ASN.1 の定義解析、入力診断、DER 生成は DER Builder 自身の責務とし、DerEditor は生成結果の解析確認、表示、編集・保存導線だけに利用する。

### 3.3 「x509gadgets と同じ構成」の解釈

トップレベルの構成、公開ファサード、検証・公開フローを同じにする。ASN.1 パーサーとフォーム生成は規模が大きいため、内部実装は非公開サブモジュールへ分割してよい。ただし、公開 API と依存境界はルート直下のファサードから管理する。

旧リポジトリ固有の以下の要素は引き継がない。

- `.devcontainer` による Wiki 用 Gollum 環境
- `.vscode` 固有タスク
- `viewer.html` と `src/viewer.ts`
- `vite.app.config.ts` を含む二重の Vite ビルド構成
- `sync-managed-rules.yml`、WordPress 公開など `x509gadgets` にないワークフロー
- Wiki を唯一の仕様正本とする運用

## 4. 対象リポジトリ構成

初期実装では、次の外形を目標とする。

```text
derbuilder/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── pages.yml
│       ├── release.yml
│       └── npm-publish.yml
├── docs/
│   ├── refs/
│   │   └── asn1instancebuilder-to-derbuilder-plan.md
│   ├── api-specification.md
│   ├── dependency-policy.md
│   ├── deployment.md
│   ├── feature-specification.md
│   ├── github-prerequisites.md
│   ├── npm-publishing.md
│   ├── release-process.md
│   └── user-guide.md
├── e2e/
│   └── app.spec.ts
├── scripts/
│   └── prepare-release.mjs
├── src/
│   ├── app.ts
│   ├── core.ts
│   ├── dereditor-adapter.ts
│   ├── dereditor.d.ts
│   ├── internal.ts
│   ├── main.ts
│   ├── model.ts
│   ├── styles.css
│   ├── validation.ts
│   ├── version.ts
│   └── internal/
│       ├── definition-parser.ts
│       ├── der.ts
│       ├── instance-builder.ts
│       ├── form-model.ts
│       ├── form-renderer.ts
│       ├── definition-bundle.ts
│       ├── ui-profile.ts
│       └── named-object-bundles.ts
├── test/
│   ├── fixtures/
│   ├── core.test.ts
│   ├── validation.test.ts
│   ├── app-model.test.ts
│   ├── policy.test.ts
│   └── release.test.ts
├── AGENTS.md
├── LICENSE
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.types.json
└── vite.config.ts
```

このツリーは責務の基準であり、実装開始前の設計レビューで内部ファイルをさらに分割してよい。次の規則は維持する。

- `src/core.ts` は UI 非依存の公開 Core API ファサードとする。
- `src/validation.ts` は診断 API の公開ファサードとする。
- `src/app.ts` はブラウザーアプリと app 固有型の公開ファサードとする。
- `src/dereditor-adapter.ts` に DerEditor との相互運用を集約する。
- `src/model.ts` に公開データモデルを集約する。
- `src/internal/` は npm の `exports` に公開しない。
- テスト専用 fixture と製品に同梱する NamedObjects データを混同しない。製品用データは `src` 内、ゴールデンテスト用データは `test/fixtures` 内に置く。

## 5. 公開パッケージ要件

`package.json` の公開面は次を基本とする。

| import | 責務 |
| --- | --- |
| `@pkistudio/derbuilder` | Core API。互換性を保つため主要な診断 API も再 export する |
| `@pkistudio/derbuilder/core` | Core API の明示的エイリアス |
| `@pkistudio/derbuilder/validation` | Schema、Instance、Definition Bundle の診断 API と型 |
| `@pkistudio/derbuilder/app` | `initDerBuilder`、Definition Bundle、UI Profile、NamedObjects |
| `@pkistudio/derbuilder/styles.css` | ブラウザーアプリのスタイル |

追加要件は次のとおり。

- ESM のみを対象とする。
- `dist`、`docs`、`README.md`、`LICENSE` だけを npm パッケージに含める。
- 型宣言を `dist/types` に生成する。
- 公開されない内部モジュールへ利用者が到達できないよう `exports` を明示する。
- `publishConfig.access` は `public`、registry は `https://registry.npmjs.org/` とする。
- 直接依存は完全固定し、`package-lock.json` をコミットする。
- 初回バージョンは `0.1.0` とし、タグと GitHub Release 名は `v` なしの `X.Y.Z` とする。

## 6. 機能要件

### FR-01: ローカル完結

- 定義、Instance JSON、Definition Bundle、生成 DER の処理をブラウザー内で完結させる。
- 外部 ASN.1 定義、OID 表、スキーマ、サンプル、Viewer コードを実行時に取得しない。
- ファイル、クリップボード、ダウンロード、同一オリジンの DerEditor 転送だけをブラウザー I/O とする。

### FR-02: ASN.1 定義の入力

- `.asn1`、`.txt` の ASN.1 定義テキストをローカルファイルから読み込めること。
- ASN.1 定義テキストをクリップボードから読み込めること。
- Schema Model JSON をローカルファイルまたは API から読み込めること。
- 入力内容から ASN.1 テキストと Schema Model JSON を判別すること。
- 定義ワークスペースを閉じると、定義、選択型、入力、診断、生成結果を一貫してクリアすること。

### FR-03: ASN.1 定義パーサー

以下の既存サブセットを維持する。

- `BOOLEAN`
- 正数・負数・名前付き値を含む `INTEGER`
- `BIT STRING`
- `OCTET STRING`
- `NULL`
- `OBJECT IDENTIFIER`
- `UTF8String`、`PrintableString`、`IA5String`
- `UTCTime`、`GeneralizedTime`
- `ENUMERATED`
- `SEQUENCE`、`SET`、`CHOICE`
- `SEQUENCE OF`、`SET OF`
- 定義済み型の参照
- `[0]` から `[30]` までの low-form context-specific `EXPLICIT`／`IMPLICIT` タグ
- モジュールヘッダーの `EXPLICIT TAGS`、`IMPLICIT TAGS`、`AUTOMATIC TAGS`
- `SEQUENCE`、`SET`、`CHOICE` 構成要素への automatic tag 割り当て
- `OPTIONAL`
- `BOOLEAN`、`INTEGER`、`ENUMERATED` の `DEFAULT`
- `--` から行末までのコメント

構文エラーは、少なくとも問題のトークンとオフセットを含む安定したエラーとして返す。

### FR-04: Schema Model

- `Asn1SchemaModule` をパーサー、診断、DER 生成、フォーム、ホスト API の共通契約とする。
- モジュール名、tag default、OID 名、型定義を表現する。
- 型モデルで primitive、integer、enumerated、tagged、sequence、set、choice、sequenceOf、setOf、defined を表現する。
- UI Profile は Schema Model を変更せず、Schema Model と Instance JSON が生成処理の唯一の正本であり続ける。

### FR-05: Schema 診断

`validateSchemaModule()` は、例外を投げずに構造化診断を返し、少なくとも次を検出する。

- 型名の重複
- 未定義型参照
- 同一構成内のフィールド名重複
- 同一構成内の context-specific tag 重複
- `0..30` 外または整数でない tag 番号
- 名前付き数値の名前重複
- 名前付き数値の値重複に対する warning

各診断は `severity`、安定した `code`、`message`、フィールドへ到達できる `path` を持つ。

### FR-06: Instance JSON

Instance JSON を診断と DER 生成の標準入力形式とする。

- `BOOLEAN` は boolean。
- `INTEGER` は整数、bigint、10 進文字列、または名前付き値。JSON 経由では bigint を除く。
- `ENUMERATED` は整数または名前付き値。
- 文字列型と時刻型は string。
- `OBJECT IDENTIFIER` は dotted-decimal、組み込み名、または schema 固有名。
- `NULL` は `null`。
- `SEQUENCE`／`SET` はフィールド名を key とする object。
- `SEQUENCE OF`／`SET OF` は array。
- `CHOICE` は `{ "selected": string, "value": unknown }`。
- byte input は `Uint8Array`、`0..255` の number array、compact HEX、`{ hex }`、`{ utf8 }`、`{ base64 }`。
- `BIT STRING` は byte input 単体、または `{ "bytes": ByteInput, "unusedBits": 0..7 }`。

### FR-07: Instance 診断

`validateInstance()` は全フィールドを可能な限り走査し、最初のエラーだけでなく複数の構造化診断を返す。

少なくとも次を検証する。

- 未知の root type
- required、optional、defaulted field の扱い
- primitive の値型
- 名前付き `INTEGER`／`ENUMERATED`
- `CHOICE` の selected/value 形式と未知 alternative
- constructed object と OF array の形
- OID の構文と先頭 arc
- HEX、Base64、UTF-8、number array の byte input
- `BIT STRING` の unused bits と空 payload の組み合わせ
- `UTCTime`／`GeneralizedTime` の DER 形式、範囲、実在日

error が 1 件でもある場合は DER 生成を実行しない。warning は表示したうえで生成を許可する。

### FR-08: DER 生成

- `createInstance(schema, typeName, input)` は `{ moduleName, typeName, der }` を返す。
- `encodeValue()` と `resolveDefinedType()` を Core API として提供する。
- `BOOLEAN true` は `ff`、整数は最小二の補数、長さは definite DER で符号化する。
- `SET` と `SET OF` の要素を DER byte の辞書順に並べる。
- default 値と同値のフィールド、および未指定の default field を省略する。
- explicit tag は内側 TLV を包み、implicit tag は universal tag を context-specific tag に置き換える。
- エラーには Instance JSON のフィールドまたは配列 index の path を付ける。
- 全旧 fixture について、旧ベースラインと byte-for-byte で同一の DER を生成する。

### FR-09: byte と OID の helper

- `bytesToHex()` と `hexToBytes()` を提供する。
- 組み込み PKI OID 名と Schema Model の `oidNames` を Instance 入力から dotted-decimal OID へ解決する。
- DER 生成用の「名前から OID」解決と、DerEditor 表示用の「OID から表示名」解決を別責務として扱う。
- DerEditor 側の OID resolver は Viewer 表示にだけ利用し、Core の入力契約を暗黙に変更しない。

### FR-10: Definition Bundle

Definition Bundle は次を持つ portable JSON とする。

- `id`、bundle format の `version`、`label`、任意の `description`
- raw ASN.1 または解析済み Schema Model のいずれか一方
- 1 件以上の entry
- entry ごとの `id`、`typeName`、label/description、`sampleInput`、`defaultInput`、任意の UI Profile

要件は次のとおり。

- `.definition-bundle.json` と `.bundle.json` を読み込めること。
- JSON parse と bundle shape の診断を例外なしで取得できること。
- entry は id を優先し、次に type name で選択できること。
- `sampleInput` を `defaultInput` より優先すること。
- 未知の追加 field は保持・許容し、ホスト固有 metadata を破壊しないこと。
- active workspace を bundle として保存できること。
- 既存 bundle から保存する場合は bundle metadata と非選択 entry を可能な範囲で維持すること。
- 出力前に bundle shape を検証すること。
- Instance の意味検証は選択された schema/type に対して通常の `validateInstance()` で行うこと。

### FR-11: UI Profile

- UI Profile は type ごとの optional なフォーム表示 metadata とする。
- label、description、widget、placeholder、default input hint、hidden、collapsed、order、input mode を表現できること。
- field path は dot path と path segment array を扱うこと。
- array の繰り返し要素には `extensions.*.extnValue` のような `*` template を使えること。
- exact path が template path より優先されること。
- profile がなくても Schema Model だけから完全に利用可能なフォームを生成すること。
- profile は診断結果や DER byte を変更しないこと。

### FR-12: NamedObjects

次の既存カタログと sample input を Definition Bundle として維持する。

- Person
- TaggedPerson
- BinaryRecord
- DefaultRecord
- SignedRecord
- VersionedSerial
- TBSCertificatePrefix
- Certificate
- CertificationRequest
- CertificateList
- AlgorithmIdentifier
- PkiBundle

Certificate、CertificationRequest、CertificateList、PkiBundle の主 entry には既存 UI Profile 相当を付ける。子型は type selector から選択可能にし、sample があれば切り替える。

### FR-13: PKI component definition

- 共通 PKI ASN.1 定義テキストを Core API から提供する。
- 少なくとも AlgorithmIdentifier、Name、SubjectPublicKeyInfo、Extension、TBSCertificate、Certificate、CertificationRequest、PrivateKeyInfo、ContentInfo の既存ベースラインを維持する。
- PkiBundle のようなデモ用 wrapper は共通ベースラインと分離する。

### FR-14: ブラウザーアプリ

ブラウザーアプリは、少なくとも次の領域を持つ。

- Definition
- Instance Input
- Diagnostics
- Generated DER / DerEditor
- Operation/API Log
- About

主操作は次のとおり。

1. file、clipboard、Definition Bundle、NamedObjects のいずれかから定義を読み込む。
2. root type を選ぶ。
3. Form または JSON で同一の Instance 値を編集する。
4. Schema 診断と Instance 診断を行う。
5. error がなければ DER を生成する。
6. 生成 DER を埋め込み read-only DerEditor へ表示する。
7. DerEditor の公開 Send to 機能から、同一アプリの editable な standalone view を開く。

UI の追加要件は次のとおり。

- JSON を Form に切り替えたときに parse できない場合、JSON を失わず Form 側にエラーを表示する。
- Form edit は canonical Instance JSON へ即時反映する。
- primitive、named values、constructed types、CHOICE、OF、optional/default、byte mode、BIT STRING unused bits をフォーム編集できる。
- 診断を該当 field path の近くへ表示できる。
- type 切り替え時の sample/default 読み込みを一貫させる。
- build、parse、validation、DerEditor load、save、失敗を log に残す。
- file dialog の cancel をエラー扱いしない。
- pointer と keyboard で操作できる separator を備え、狭い画面では安全に stack する。
- pane size を保存する場合は同一オリジンの local storage に限定する。

### FR-15: 埋め込み App API

`initDerBuilder()` は selector または Element を mount target として受け付ける。

初期 option として Schema Model、Instance input、必要に応じて Definition Bundle を受け取れるようにする。返却インスタンスは少なくとも次を提供する。

- `build(options?)`
- `loadBundle(bundle, entryIdOrTypeName?)`
- `loadSchema(schema)`
- `loadInput(input)`
- `close()`

build の結果は UI 内部だけに保持せず、生成 document または構造化した失敗結果を呼び出し元が扱える API 設計にする。旧 API の `Promise<void>` をそのまま固定せず、Phase 0 で戻り値を確定する。

### FR-16: 保存と出力

- ASN.1 定義をローカルファイルへ保存できること。
- Definition Bundle をローカル JSON ファイルへ保存できること。
- 生成 DER は DerEditor の公開された保存機能から保存可能にすること。
- 必要性が確認された場合は、DER Builder 側に直接の `.der` download と HEX clipboard を追加できる設計にするが、初期 parity の必須条件にはしない。

## 7. DerEditor 取り込み要件

### 7.1 依存境界

- 初期ベースラインは `@pkistudio/dereditor` の完全固定版 `0.1.4` とする。
- 実装開始時に `x509gadgets` の参照コミットと npm 公開状態を再確認し、変更が必要なら依存更新だけの独立 PR とする。
- import は package export の `core`、`oid-resolver`、`viewer`、公開 icon subpath に限定する。
- `app`、`static`、`docs`、`manuals` など内部パスを import しない。
- `src/dereditor-adapter.ts` 以外に DerEditor API の詳細を拡散させない。型 import と公開 icon import は、ポリシーテストで明示的に許可した箇所だけ例外とする。

### 7.2 adapter の責務

adapter は少なくとも次を提供する。

- DER input の `parseInput(..., { format: 'der', validateRoundTrip: true })`
- OID resolver の注入
- read-only／editable を明示した Viewer mount
- `loadBytes()`、`close()`、`setEditable()` の薄いラッパー
- DER Builder と DerEditor のバージョンを独立して公開・表示するための version 取得
- 必要な byte-to-hex/base64 helper の委譲

DerEditor DOM の class、内部 action、storage key を DER Builder の API や実装契約にしない。

### 7.3 Viewer ライフサイクル

- 通常の DER Builder 画面では Viewer を read-only とする。
- 生成成功時に同じ Viewer instance へ bytes を load する。
- Viewer 内の OID 解決は package 同梱 resolver を使い、URL lookup を行わない。
- DerEditor の公開 Send to transfer query (`subtree` または `expand`) を検出した同一ページでは Viewer を editable とする。
- standalone 用の独自 `viewer.html`、独自 localStorage payload、独自 popup protocol は実装しない。
- 通常タブには `pkistudio.ico`、DerEditor transfer tab には `dereditor.ico` の公開 package asset を使用する。
- transfer 画面では不要な DER Builder shell を簡略化または非表示にし、DerEditor が転送 payload を所有できるようにする。

## 8. 非機能要件

### NFR-01: セキュリティとネットワーク境界

- production HTML に `connect-src 'none'` を含む CSP を設定する。
- source と bundle に `fetch`、XHR、WebSocket、EventSource、sendBeacon を含めない。
- ユーザー入力を HTML として挿入せず、表示時に escape する。
- Definition Bundle の未知 metadata をコードとして評価しない。
- object URL や local storage の一時データはライフサイクル終了時に解放する。

### NFR-02: 型とブラウザー互換性

- TypeScript strict、unused locals/parameters、fallthrough checks を有効にする。
- Core API は DOM、VS Code API、Node-only runtime API に依存しない。
- ブラウザー固有機能は `src/app.ts` 側へ閉じ込める。
- Vite の production output は相対 base で GitHub Pages の project site から動作する。

### NFR-03: 決定性

- 同じ Schema Model と Instance input は同じ DER byte を生成する。
- `SET`／`SET OF` order、default omission、integer encoding をゴールデンテストで固定する。
- Definition Bundle の再保存は意図しない metadata 消失を起こさない。

### NFR-04: アクセシビリティと画面設計

- menu、tab、dialog、separator、diagnostics、status/log に適切な role と accessible name を付ける。
- keyboard だけで type 選択、Form/JSON 切り替え、build、menu、separator 操作が可能であること。
- 390px 幅を代表値として、主要領域へ到達可能な responsive layout を維持する。

### NFR-05: 配布可能性

- `npm pack --dry-run` で不要な source、fixture、秘密情報を含めない。
- Pages artifact と公開後に取得したファイルが byte-for-byte で一致することを検証する。
- build、test、type declaration 生成後に working tree が変更されないこと。

## 9. 初期スコープ外と既知の制限

旧パーサーの既知の制限を初期リリースでも明示する。

- ASN.1 constraints
- extension marker
- parameterized type
- value assignment
- macro
- 完全な module import
- high-form tag number
- 任意の ASN.1 module を処理する完全準拠コンパイラ
- X.509、CSR、CRL の意味・暗号学的妥当性検証
- OS trust store、ネットワーク取得、remote schema registry
- VS Code 固有の file dialog、Webview lifecycle、host persistence

上記を黙って受理・誤符号化せず、未対応構文として明確に失敗させる。

## 10. テスト計画

### 10.1 Unit とゴールデンテスト

`x509gadgets` に合わせ、`tsx --test test/*.test.ts` と Node built-in test runner を利用する。旧 Vitest 固有 API は移行する。

最低限のテスト分類は次のとおり。

- parser: module header、tag、primitive、constructed、defined type、named number、default、構文 offset
- schema diagnostics: duplicate、unknown reference、tag range
- instance diagnostics: path、複数 error、OID、byte、time、CHOICE
- DER: 正負 integer、default omission、explicit/implicit/automatic tag、SET sort
- fixtures: Person、binary、Certificate、CSR、CRL、PKI components
- bundle/profile: parse、validation、metadata preservation、entry selection、wildcard path
- public API: package entry と declaration contract
- DerEditor adapter: 全生成 fixture の parse と round trip
- policy: PkiStudio dependency、禁止 import、禁止 network、CSP、workflow
- release: version marker と workflow contract

旧 fixture は移植前に旧ベースラインで DER byte を記録し、新実装と byte-for-byte 比較する。単に「parse できる」だけを parity 判定にしない。

### 10.2 E2E

Playwright Chromium で少なくとも次を自動化する。

- app 起動、About、package icon
- NamedObject の load、type 選択、Form/JSON 同期、build
- raw ASN.1、Schema JSON、Definition Bundle の file load
- clipboard load
- invalid definition、invalid bundle、invalid instance で build が block されること
- definition と bundle の download
- 生成 DER が embedded read-only DerEditor に表示されること
- DerEditor Send to で editable standalone view が開くこと
- popup block/cancel が安全に log されること
- pane resize と keyboard resize
- narrow viewport
- console/page error がないこと
- app 操作中に外部 request が 1 件もないこと

### 10.3 標準検証コマンド

実装完了後の handoff 前に次をすべて実行する。

```sh
npm test
npm run check
npm run build
npm run test:e2e
npm run pack:dry-run
```

新しい環境では事前に `npm run test:e2e:install` を実行する。総合コマンド `npm run verify` には unit、typecheck、build、package dry-run を含め、browser verification は `npm run verify:browser` で build 後に実行する。

## 11. 開発ワークフロー

### 11.1 通常変更

1. `main` から目的別の feature branch を作る。
2. 要件 ID と fixture を先に特定する。
3. Core、App、Viewer、workflow を一つの巨大 PR に混在させず、下記 phase 単位で PR を分ける。
4. ローカル標準検証を通す。
5. draft PR を作成する。
6. CI の unit、typecheck、build、E2E、pack、audit を通す。
7. レビュー後に merge する。
8. `main` の Pages deploy と公開内容照合を確認する。

### 11.2 CI

`.github/workflows/ci.yml` は pull request と `main` push で実行し、`x509gadgets` と同じ検証順序にする。

1. `actions/checkout`
2. Node.js 24 setup と npm cache
3. `npm ci`
4. `npm audit --audit-level=high`
5. `npm test`
6. `npm run check`
7. `npm run build`
8. Chromium install
9. `npm run test:e2e`
10. `npm run pack:dry-run`

権限は `contents: read` のみにする。別の PkiStudio リポジトリを checkout しない。

### 11.3 GitHub Pages

`.github/workflows/pages.yml` は `main` push と manual dispatch で実行する。

- CI と同等の検証を再実行してから `dist` を artifact 化する。
- CSP と remote transport 不在を production output で検証する。
- generated source 差分がないことを確認する。
- Pages artifact を deploy する。
- deploy 後、保持した source artifact と公開 URL から取得した全ファイルを比較する。
- concurrency は `derbuilder-github-pages` とし、古い in-progress deploy を cancel する。
- 権限は `contents: read`、`pages: write`、`id-token: write` に限定する。

### 11.4 Release

`.github/workflows/release.yml` は manual dispatch のみとする。

- `RELEASE` の明示 confirmation を要求する。
- exact version または patch/minor/major increment を受け付ける。
- `X.Y.Z`、`v` prefix なしだけを許可する。
- release 対象の `main` commit と同じ SHA に成功した Pages deployment があることを要求する。
- `package.json`、lockfile、`src/version.ts`、README の version を prepare script で同期する。
- version metadata は release 実行前に PR で merge 済みであることを要求する。
- annotated tag と version-only GitHub Release を作成する。

### 11.5 npm 公開

`.github/workflows/npm-publish.yml` は公開済み stable GitHub Release だけを対象とする。

- `NPM_RELEASE` の明示 confirmation を要求する。
- 通常は npm Trusted Publishing/OIDC を使う。
- 初回だけ environment secret の一時 token bootstrap を許可する。
- Release tag、package、lockfile の version 一致を検証する。
- 同 version が npm に存在しないことを確認する。
- clean checkout で test、check、build、pack を再実行する。
- `npm publish --access public` 後、registry が対象 version を返すまで確認する。

## 12. 段階的な開発計画

### Phase 0: 契約確定

成果物:

- `feature-specification.md` と `api-specification.md` の初版
- 公開 API 名、build 戻り値、diagnostic code の一覧
- 旧 fixture と期待 DER の manifest
- Definition Bundle/UI Profile の versioning 方針

完了条件:

- この文書の未決事項に結論がある。
- 旧挙動を「維持」「意図的変更」「対象外」に分類できている。

### Phase 1: x509gadgets 型の土台

成果物:

- root config、package metadata、strict TypeScript、単一 Vite config
- Node test runner、Playwright、version script
- docs の骨格と AGENTS.md
- 空の public facade と package exports

完了条件:

- empty app の test、check、build、E2E、pack が通る。
- `dist` 以外に generated 差分を残さない。

### Phase 2: Schema Model、parser、DER core

成果物:

- model、bytes、OID、parser、DER encoder、instance builder
- 旧 core export の DER Builder 名への再定義
- PKI component baseline

完了条件:

- 旧 core fixture が byte-for-byte parity を満たす。
- Core source が DOM と DerEditor Viewer に依存しない。

### Phase 3: 診断

成果物:

- Schema、Instance の構造化診断
- path と code の安定化
- invalid input の網羅テスト

完了条件:

- error は build を block し、warning は block しない。
- 複数 error と nested path がテストされる。

### Phase 4: Definition Bundle、UI Profile、NamedObjects

成果物:

- bundle parse/validate/save
- generic form model と UI Profile 適用
- NamedObjects catalog と production sample data

完了条件:

- profile の有無で DER が変わらない。
- bundle round trip で未知 metadata と非選択 entry が保たれる。
- PKI 系 4 bundle の主要 profile がテストされる。

### Phase 5: ブラウザーアプリ

成果物:

- Definition、Instance、Diagnostics、Log、About
- file/clipboard/download、Form/JSON、type selection、build flow
- responsive layout と accessible separator

完了条件:

- 旧手動 smoke check を Playwright へ置き換える。
- cancel、invalid JSON、empty workspace を含む状態遷移が安全である。

### Phase 6: DerEditor 統合

成果物:

- pinned package、adapter、local typings、icons
- embedded read-only generated DER viewer
- same-page editable transfer mode
- PkiStudioJS と独自 viewer page の完全撤去

完了条件:

- 全 fixture を DerEditor core が round-trip parse できる。
- 通常 Viewer の save/edit が無効で、transfer Viewer は editable である。
- lockfile の PkiStudio package が DerEditor だけである。

### Phase 7: ポリシー、E2E、Pages

成果物:

- dependency、network、workflow の policy tests
- Playwright acceptance suite
- CI と Pages workflow

完了条件:

- 外部 request がない。
- deployed artifact verification が成功する。
- 他リポジトリ checkout がない。

### Phase 8: 公開準備

成果物:

- README、user/API/feature/dependency/deployment/release/npm docs
- release と npm publish workflow
- `0.1.0` version metadata

完了条件:

- `npm pack --dry-run` の内容をレビュー済みである。
- Pages の同一 SHA deployment 後だけ Release を作成できる。
- stable Release からだけ npm publish できる。

## 13. 旧構成からの対応表

| 旧 `asn1instancebuilder` | DER Builder での扱い |
| --- | --- |
| `src/core.ts`、`src/core/*` | `src/core.ts` 公開ファサード、`src/model.ts`、`src/internal/*` へ整理して移植 |
| `src/core/pkistudio-adapter.ts` | 削除し `src/dereditor-adapter.ts` に置換 |
| `src/app.ts`、`src/app/*` | `src/app.ts` 公開ファサードと非公開 app module に再構成 |
| `src/viewer.ts`、`viewer.html` | 削除。同一 `index.html` の DerEditor transfer mode に置換 |
| `src/types/pkistudiojs.d.ts` | 削除し `src/dereditor.d.ts` に置換 |
| `src/styles/styles.css` | `src/styles.css` を公開 entry とし、必要なら非公開 style module に分割 |
| root `fixtures/` | production NamedObjects と test fixture に分離 |
| `vite.config.ts` + `vite.app.config.ts` | `x509gadgets` 型の単一 `vite.config.ts` に統合 |
| Vitest | Node test runner + `tsx` に置換 |
| 旧 CI/Pages/publish/WordPress | `x509gadgets` 型の CI/Pages/Release/npm 4 workflow に置換 |
| Wiki 中心の仕様 | repository 内 `docs` を正本とし、Wiki は必要なら公開用 mirror とする |
| `@pkistudio/pkistudiojs` | 完全削除。pinned `@pkistudio/dereditor` だけを採用 |

## 14. リスクと対策

| リスク | 対策 |
| --- | --- |
| 再実装で DER byte が変わる | 旧 commit で fixture ごとの golden DER を固定し byte 比較する |
| old UI と新 Viewer の状態管理が競合する | DerEditor adapter を単一境界にし、Viewer state と builder state を分離する |
| DerEditor の undocumented DOM に依存する | public package export と instance method 以外を使用せず policy test で守る |
| OID name map の向きを混同する | build input resolver と viewer display resolver を別 API・別テストにする |
| bundle の未知 metadata を失う | parse/save round-trip fixture を用意する |
| NamedObjects が test fixture に依存して production build が不安定になる | production sample を `src` 内に置き、test fixture は複製でなく生成結果照合に使う |
| popup や clipboard がブラウザー設定で失敗する | 失敗を構造化 status/log にし、build 結果自体は失わない |
| workflow の権限が広がる | job ごとに最小権限を明示し policy test で固定する |
| 旧 package 利用者が移行できない | 初期リリース後に別途 migration guide と必要な compatibility adapter を評価する |

## 15. 実装前に確定する事項

以下は Phase 0 で決め、仕様書へ反映する。

1. `build()` の戻り値を `InstanceDocument` とするか、diagnostics を含む result union とするか。
2. `DefinitionBundle` と `UiProfile` を app export に限定するか、独立 package entry を追加するか。
3. direct `.der` download と HEX clipboard を初回リリースへ含めるか。
4. 旧 `Asn1InstanceBuilderError` 相当を `DerBuilderError` として公開するか。
5. root export が validation を再 export する期間と、将来の API 安定化方針。
6. pane layout と transfer mode の最終 UI wireframe。

これらは DER byte parity、DerEditor 境界、ローカル完結、`x509gadgets` 型ワークフローという確定方針を変更しない範囲の設計判断である。

## 16. 全体の完了条件

DER Builder `0.1.0` は、次をすべて満たした時点で再構築完了とする。

- 旧 `asn1instancebuilder` の対象 fixture と Core 挙動を byte-for-byte で再現する。
- Definition Bundle、UI Profile、NamedObjects、Form/JSON、diagnostics の対象機能を備える。
- PkiStudioJS、専用 viewer page、他 PkiStudio リポジトリとの source coupling がない。
- 公開済みで完全固定した DerEditor package だけを package exports 経由で使用する。
- embedded read-only Viewer と editable transfer Viewer が E2E で確認される。
- unit、typecheck、build、E2E、pack、audit、policy tests が成功する。
- production app が外部通信を行わず、CSP が `connect-src 'none'` を強制する。
- GitHub Pages が検証済み `dist` と一致する。
- Pages へ成功した同一 SHA からだけ Release を作成できる。
- stable GitHub Release からだけ `@pkistudio/derbuilder` を npm 公開できる。
- README と repository 内 docs が実装済み挙動と一致する。
