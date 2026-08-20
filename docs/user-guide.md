# User Guide

## Build a DER document

1. Open **Load** in the Definition pane.
2. Load local ASN.1 or Schema Model JSON, paste ASN.1 from the clipboard, load a
   Definition Bundle, or select a built-in NamedObject.
3. Select the root ASN.1 type in **Instance Input**.
4. Edit the value in **Form** or **JSON**. Both modes represent the same
   Instance JSON value.
5. Select **Build DER**.
6. Correct any Schema or Instance errors shown in **Diagnostics**.
7. Inspect successful output in the read-only **Generated DER** viewer.

The API Log records definition loading, parsing, validation, generation,
DerEditor loading, saves, and failures. **Clear** removes only log entries.

## Definition input

ASN.1 files normally use `.asn1` or `.txt`. Schema Model and Definition Bundle
files use JSON. The app detects a Schema Model when definition content begins
with a JSON object. Selecting **Close** resets the active definition, input,
diagnostics, and generated viewer.

Clipboard access depends on browser permission and a secure context. Cancelling
a file dialog leaves the current workspace unchanged.

## Form and JSON modes

Form mode is generated from the Schema Model. Optional and defaulted fields have
a **Set** control. Choices expose an alternative selector, OF types support
adding and removing items, and byte fields support HEX, UTF-8, or Base64 modes.

Form edits immediately update canonical formatted JSON. If JSON is malformed
when switching to Form, the original text remains and Form mode displays the
parse error so it can be corrected without losing input.

## Definition Bundles

A bundle packages a schema, selectable root entries, sample/default Instance
values, UI Profiles, and optional host metadata. Loading chooses an entry by id
before type name and prefers `sampleInput` to `defaultInput`.

Use **Save → Definition Bundle** to download the current workspace. Existing
bundle labels, descriptions, unselected entries, and unknown metadata are
preserved where possible. **Save → to File** downloads the current definition.

## Generated DER and DerEditor

The embedded viewer is read-only. Select a node and use DerEditor's **Send to**
action to open a standalone editable view. That view uses the DerEditor icon and
save behavior while retaining the same local-only application URL.

DER Builder validates and creates structure; it does not sign certificates,
verify signatures, validate PKI semantics, or retrieve remote data.

## Narrow layouts and keyboard use

At narrow widths, panes stack and remain scrollable. Separators can be focused
with the keyboard; use arrow keys to resize the Definition, Diagnostics, or API
Log areas when the relevant separator is visible.
