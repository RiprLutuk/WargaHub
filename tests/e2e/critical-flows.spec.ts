import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const demoPassword = process.env.E2E_DEMO_PASSWORD ?? 'WargaHub123!';
const residentEmail =
  process.env.E2E_RESIDENT_EMAIL ?? 'warga@demo.wargahub.id';
const treasurerEmail =
  process.env.E2E_TREASURER_EMAIL ?? 'bendahara@demo.wargahub.id';

async function login(
  context: BrowserContext,
  email: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/kata sandi|password/i).fill(demoPassword);
  await page.getByRole('button', { name: /masuk/i }).click();
  await expect(page).toHaveURL(/\/(app|admin)(\/|$)/);
  return page;
}

test.describe('alur kritis WargaHub', () => {
  test.describe.configure({ mode: 'serial' });

  test('halaman publik tidak memaparkan akun demo atau data rumah', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /darurat/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('@demo.wargahub.id');
    await expect(page.locator('body')).not.toContainText(/A-01|B-02/);
  });

  test('warga masuk tanpa memperoleh navigasi administrasi', async ({
    browser,
  }) => {
    const resident = await browser.newContext();
    try {
      const page = await login(resident, residentEmail);
      await expect(page.getByRole('link', { name: /tagihan/i })).toBeVisible();
      await expect(
        page.getByRole('link', { name: /kelola warga/i }),
      ).toHaveCount(0);
    } finally {
      await resident.close();
    }
  });

  test('warga mengirim bukti pembayaran dan bendahara memverifikasinya', async ({
    browser,
  }) => {
    const resident = await browser.newContext();
    const treasurer = await browser.newContext();

    try {
      const residentPage = await login(resident, residentEmail);
      await residentPage.getByRole('link', { name: /tagihan/i }).click();
      await residentPage
        .getByRole('button', { name: /kirim bukti/i })
        .first()
        .click();

      const amount = residentPage.getByLabel(/nominal/i);
      if ((await amount.count()) > 0) {
        await amount.fill('150000');
      }
      await residentPage.locator('input[type="file"]').first().setInputFiles({
        name: 'bukti-pembayaran.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await residentPage
        .getByRole('button', { name: /tinjau pembayaran/i })
        .click();
      await residentPage
        .getByRole('button', {
          name: /unggah bukti|kirim pembayaran|simpan bukti|kirim untuk diperiksa/i,
        })
        .last()
        .click();
      await expect(
        residentPage.getByText(/menunggu pemeriksaan bendahara/i),
      ).toBeVisible();

      const treasurerPage = await login(treasurer, treasurerEmail);
      await treasurerPage
        .getByRole('link', { name: /pembayaran/i })
        .click();
      await treasurerPage
        .getByRole('button', { name: /verifikasi pembayaran/i })
        .first()
        .click();
      await expect(
        treasurerPage.getByText(/pembayaran terverifikasi|lunas/i),
      ).toBeVisible();

      await residentPage.reload();
      await expect(residentPage.getByText('Lunas').first()).toBeVisible();
    } finally {
      await Promise.all([resident.close(), treasurer.close()]);
    }
  });
});
