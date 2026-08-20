import { expect, test, type Page } from '@playwright/test';

const pageErrors = new WeakMap<Page, string[]>();

const personDefinition = `Example DEFINITIONS ::= BEGIN
Person ::= SEQUENCE {
  name UTF8String,
  age INTEGER OPTIONAL,
  email IA5String OPTIONAL
}
END`;

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('starts with the DER Builder identity and makes every primary pane available', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.derbuilder-workspace')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Generated DER' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'API call log' })).toBeVisible();

  await page.getByLabel('Application toolbar').getByRole('button', { name: 'About' }).click();
  await expect(page.getByRole('dialog')).toContainText('Version 0.1.0');
  await expect(page.getByRole('dialog')).toContainText('inspect successful output in DerEditor');
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
});

test('loads Person from NamedObjects, synchronizes Form and JSON, and builds read-only DER locally', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url());
  });

  await openApp(page);
  await loadNamedObject(page, 'person');
  await expect(page.locator('[data-role="type"]')).toHaveValue('Person');
  await expect(page.locator('[data-role="input"]')).toHaveValue(/Alice/);

  await page.getByRole('tab', { name: 'Form' }).click();
  const nameInput = page.locator('[data-role="input-form"]').getByRole('textbox', { name: 'name', exact: true });
  await expect(nameInput).toHaveValue('Alice');
  await nameInput.fill('Bob');
  await page.getByRole('tab', { name: 'JSON' }).click();
  await expect(page.locator('[data-role="input"]')).toHaveValue(/"name": "Bob"/);

  await page.getByRole('button', { name: 'Build DER' }).click();
  await expect(page.locator('[data-role="build-status"]')).toContainText('Built Person');
  await expect(page.locator('[data-role="der-viewer"] .tree')).toBeVisible();
  await expect(page.locator('[data-role="der-viewer"]')).toContainText('generated DER · read-only');
  await expect(page.locator('[data-role="der-viewer"] [data-action="toggle-save-menu"]')).toBeDisabled();
  await expect(page.locator('[data-role="api-log"]')).toContainText('loadDerEditor');
  expect(externalRequests).toEqual([]);
});

test('loads raw ASN.1 and blocks invalid Instance JSON with structured diagnostics', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-role="definition-file"]').setInputFiles({
    name: 'person.asn1',
    mimeType: 'text/plain',
    buffer: Buffer.from(personDefinition)
  });
  await expect(page.locator('[data-role="type"]')).toHaveValue('Person');
  await page.locator('[data-role="input"]').fill('{"age":42}');
  await page.getByRole('button', { name: 'Build DER' }).click();
  await expect(page.locator('[data-role="diagnostics"]')).toContainText('missing-field');
  await expect(page.locator('[data-role="diagnostics"]')).toContainText('name');
  await expect(page.locator('[data-role="build-status"]')).toContainText('Instance diagnostics contain errors');
});

test('loads Schema Model JSON and ASN.1 from the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:4173'
  });
  await openApp(page);
  const schema = {
    name: 'ModelExample',
    tagDefault: 'explicit',
    types: [{ name: 'Flag', type: { kind: 'boolean' } }]
  };
  await page.locator('[data-role="definition-file"]').setInputFiles({
    name: 'flag.schema.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(schema))
  });
  await expect(page.locator('[data-role="type"]')).toHaveValue('Flag');

  await page.evaluate((source) => navigator.clipboard.writeText(source), personDefinition);
  const definitionActions = page.getByLabel('Definition actions');
  await definitionActions.getByRole('button', { name: 'Load', exact: true }).hover();
  await definitionActions.getByRole('menuitem', { name: 'from Clipboard' }).click();
  await expect(page.locator('[data-role="type"]')).toHaveValue('Person');
  await expect(page.locator('[data-role="definition-status"]')).toContainText('clipboard');
});

test('preserves malformed JSON when Form mode reports the parse failure', async ({ page }) => {
  await openApp(page);
  await loadNamedObject(page, 'person');
  await page.locator('[data-role="input"]').fill('{ "name":');
  await page.getByRole('tab', { name: 'Form' }).click();
  await expect(page.locator('[data-role="input-form"]')).toContainText('JSON input could not be loaded into the form');
  await page.getByRole('tab', { name: 'JSON' }).click();
  await expect(page.locator('[data-role="input"]')).toHaveValue('{ "name":');
});

test('reports malformed definitions and Definition Bundles without throwing', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-role="definition-file"]').setInputFiles({
    name: 'broken.asn1',
    mimeType: 'text/plain',
    buffer: Buffer.from('Broken DEFINITIONS ::= BEGIN Person ::= SEQUENCE {')
  });
  await expect(page.locator('[data-role="definition-status"]')).toContainText('Could not load definition');
  await expect(page.locator('[data-role="diagnostics"]')).toContainText('build-error');

  await page.locator('[data-role="definition-bundle-file"]').setInputFiles({
    name: 'broken.definition-bundle.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{')
  });
  await expect(page.locator('[data-role="definition-status"]')).toContainText('Could not load Definition Bundle');
  await expect(page.locator('[data-role="diagnostics"]')).toContainText('invalid-json');
});

test('downloads the active definition and treats file-dialog cancellation as a no-op', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-role="definition-file"]').setInputFiles({
    name: 'person.asn1',
    mimeType: 'text/plain',
    buffer: Buffer.from(personDefinition)
  });

  const definitionActions = page.getByLabel('Definition actions');
  const downloadPromise = page.waitForEvent('download');
  await definitionActions.getByRole('button', { name: 'Save', exact: true }).hover();
  await definitionActions.getByRole('menuitem', { name: 'to File' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('asn1-definition.asn1');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toBe(personDefinition);

  await page.locator('[data-role="definition"]').click();
  const chooserPromise = page.waitForEvent('filechooser');
  await definitionActions.getByRole('button', { name: 'Load', exact: true }).hover();
  await definitionActions.getByRole('menuitem', { name: 'from ASN.1/Schema File' }).click();
  await chooserPromise;
});

test('loads and saves a Definition Bundle without losing workspace metadata', async ({ page }) => {
  await openApp(page);
  const bundle = {
    id: 'example.person',
    version: '1.0.0',
    label: 'Example Person',
    description: 'E2E bundle metadata',
    schema: { format: 'asn1', sourceName: 'person.asn1', source: personDefinition },
    entries: [{ id: 'person', typeName: 'Person', label: 'Person', sampleInput: { name: 'Alice' } }],
    extensionMetadata: { owner: 'test' }
  };
  await page.locator('[data-role="definition-bundle-file"]').setInputFiles({
    name: 'person.definition-bundle.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bundle))
  });
  await expect(page.locator('[data-role="definition-status"]')).toContainText('Example Person');

  const downloadPromise = page.waitForEvent('download');
  const definitionActions = page.getByLabel('Definition actions');
  await definitionActions.getByRole('button', { name: 'Save', exact: true }).hover();
  await definitionActions.getByRole('menuitem', { name: 'Definition Bundle' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('example.person.definition-bundle.json');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const saved = JSON.parse(Buffer.concat(chunks).toString('utf8')) as typeof bundle;
  expect(saved.description).toBe(bundle.description);
  expect(saved.extensionMetadata).toEqual(bundle.extensionMetadata);
});

test('opens a DerEditor Send to subtree in an editable same-page transfer view', async ({ page }) => {
  await openApp(page);
  await loadNamedObject(page, 'person');
  await page.getByRole('button', { name: 'Build DER' }).click();
  const viewer = page.locator('[data-role="der-viewer"]');
  await viewer.locator('.icon[data-node-icon]').first().click();
  await viewer.locator('[data-node-action="send-to"]').click();
  const popupPromise = page.waitForEvent('popup');
  await viewer.locator('[data-node-action="send-new-window"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.locator('#app')).toHaveClass(/derbuilder-transfer-root/);
  await expect(popup.locator('link[rel~="icon"]')).toHaveAttribute('href', /dereditor.*\.ico|\.ico(?:\?|$)/);
  expect(await popup.locator('link[rel~="icon"]').getAttribute('href')).not.toContain('pkistudio.ico');
  await expect(popup.locator('[data-role="der-viewer"] .tree')).toBeVisible();
  await expect(popup.locator('[data-role="der-viewer"] [data-action="toggle-save-menu"]')).toBeEnabled();
  await popup.close();
});

test('keeps primary areas reachable at a 390px viewport and supports keyboard resizing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await expect(page.locator('.derbuilder-definition-panel')).toBeVisible();
  await expect(page.locator('.derbuilder-instance-panel')).toBeVisible();
  await expect(page.locator('.derbuilder-diagnostics-panel')).toBeVisible();
  await expect(page.locator('.derbuilder-generated-panel')).toBeVisible();
  await expect(page.locator('.derbuilder-log-panel')).toBeVisible();
  await expect(page.locator('[data-role="workspace-resizer"]')).toBeHidden();

  const logPanel = page.locator('.derbuilder-log-panel');
  const initialHeight = await logPanel.evaluate((element) => element.getBoundingClientRect().height);
  await page.locator('[data-role="api-log-resizer"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => logPanel.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(initialHeight);
});

test('resizes the Definition pane with a pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openApp(page);
  const definitionPanel = page.locator('.derbuilder-definition-panel');
  const initialWidth = await definitionPanel.evaluate((element) => element.getBoundingClientRect().width);
  const splitter = page.locator('[data-role="workspace-resizer"]');
  const box = await splitter.boundingBox();
  if (!box) throw new Error('Definition splitter is not visible.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2);
  await page.mouse.up();
  await expect.poll(() => definitionPanel.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(initialWidth + 60);
});

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.derbuilder-toolbar strong')).toHaveText('DER Builder');
  await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', /pkistudio\.ico(?:\?|$)/);
  await expect(page.locator('.derbuilder-workspace')).toBeVisible();
}

async function loadNamedObject(page: Page, id: string): Promise<void> {
  const definitionActions = page.getByLabel('Definition actions');
  await definitionActions.getByRole('button', { name: 'Load', exact: true }).hover();
  await definitionActions.getByRole('menuitem', { name: 'NamedObjects' }).hover();
  await definitionActions.locator(`[data-role="load-named-object"][data-object-id="${id}"]`).click();
}
