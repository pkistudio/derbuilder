import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('allows only the published DerEditor package from the PkiStudio scope', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  const pkistudioDependencies = Object.entries(packageJson.dependencies)
    .filter(([name]) => name.startsWith('@pkistudio/'));
  assert.deepEqual(pkistudioDependencies, [['@pkistudio/dereditor', '0.1.4']]);
});

test('uses no forbidden PkiStudio imports or repository coupling', async () => {
  const files = await sourceFiles(new URL('src', root));
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /@pkistudio\/(?:asn1instancebuilder|certgadgets|pkistudiojs|x509gadgets)/);
  assert.doesNotMatch(source, /github\.com\/pkistudio|raw\.githubusercontent\.com\/pkistudio/);
  assert.doesNotMatch(source, /from ['"]@pkistudio\/dereditor\/(?:app|static|docs|manuals)/);
});

test('uses only published DerEditor icon exports with no internal path', async () => {
  const mainSource = await readFile(new URL('src/main.ts', root), 'utf8');
  const appSource = await readFile(new URL('src/internal/app/main.ts', root), 'utf8');
  assert.match(mainSource, /@pkistudio\/dereditor\/pkistudio\.ico/);
  assert.match(appSource, /@pkistudio\/dereditor\/dereditor\.ico/);
  assert.doesNotMatch(`${mainSource}\n${appSource}`, /@pkistudio\/dereditor\/app\/static/);
});

test('application source has no remote transport and production CSP denies connections', async () => {
  const files = await sourceFiles(new URL('src', root));
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/);
  const adapterSource = await readFile(new URL('src/dereditor-adapter.ts', root), 'utf8');
  assert.match(adapterSource, /oidResolver:\s*DerEditorOidResolver/);
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /connect-src 'none'/);
});

test('lockfile contains no additional PkiStudio package', async () => {
  const lockfile = JSON.parse(await readFile(new URL('package-lock.json', root), 'utf8')) as {
    packages: Record<string, unknown>;
  };
  const installed = Object.keys(lockfile.packages)
    .filter((path) => path.startsWith('node_modules/@pkistudio/'));
  assert.deepEqual(installed, ['node_modules/@pkistudio/dereditor']);
});

test('package exposes only controlled public entry points', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as {
    exports: Record<string, unknown>;
    files: string[];
  };
  assert.deepEqual(Object.keys(packageJson.exports), ['.', './core', './validation', './app', './styles.css']);
  assert.deepEqual(packageJson.files, ['dist', 'docs', 'README.md', 'LICENSE']);
});

test('CI runs browser coverage without checking out another PkiStudio repository', async () => {
  const workflow = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /npm run test:e2e/);
  assert.doesNotMatch(workflow, /pkistudio\/(?:asn1instancebuilder|dereditor|x509gadgets)/i);
});

test('Pages deploys the validated dist artifact from main with least privileges', async () => {
  const workflow = await readFile(new URL('.github/workflows/pages.yml', root), 'utf8');
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /actions\/configure-pages@v6/);
  assert.match(workflow, /actions\/upload-pages-artifact@v5/);
  assert.match(workflow, /path: dist/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /actions\/download-artifact@v8/);
  assert.match(workflow, /Verify published application files/);
  assert.match(workflow, /cmp --silent/);
  assert.match(workflow, /connect-src 'none'/);
  assert.doesNotMatch(workflow, /pkistudio\/(?:asn1instancebuilder|dereditor|x509gadgets)/i);
});

test('repository Markdown documentation is English-only', async () => {
  const markdownFiles = [
    new URL('README.md', root),
    new URL('AGENTS.md', root),
    ...await markdownFilesUnder(new URL('docs', root))
  ];
  for (const file of markdownFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/, `${file.pathname} contains non-English prose`);
    if (!file.pathname.includes('/docs/refs/')) {
      assert.doesNotMatch(source, /\basn1ib\b/i, `${file.pathname} contains the retired public prefix`);
    }
  }
});

async function sourceFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: URL[] = [];
  for (const entry of entries) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory.href.endsWith('/') ? directory : new URL(`${directory.href}/`));
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

async function markdownFilesUnder(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: URL[] = [];
  for (const entry of entries) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory.href.endsWith('/') ? directory : new URL(`${directory.href}/`));
    if (entry.isDirectory()) files.push(...await markdownFilesUnder(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}
