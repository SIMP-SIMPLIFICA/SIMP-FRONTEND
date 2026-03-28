import { test, expect } from '@playwright/test';

test.describe('Módulo Financeiro', () => {
  test('navega para Financeiro Overview', async ({ page }) => {
    await page.goto('/financeiro');
    await expect(page).toHaveURL('/financeiro');
    // Aguarda conteúdo carregar (página tem gráficos com dados da API)
    await expect(page.locator('body')).not.toContainText('Carregando', { timeout: 10_000 });
  });

  test('navega para Lançamentos', async ({ page }) => {
    await page.goto('/financeiro/lancamentos');
    await expect(page).toHaveURL('/financeiro/lancamentos');
    await expect(page.locator('body')).not.toContainText('Carregando', { timeout: 10_000 });
  });

  test('navega para Relatórios', async ({ page }) => {
    await page.goto('/financeiro/relatorios');
    await expect(page).toHaveURL('/financeiro/relatorios');
  });

  test('navega para Inteligência', async ({ page }) => {
    await page.goto('/financeiro/inteligencia');
    await expect(page).toHaveURL('/financeiro/inteligencia');
  });

  test('submenu Financeiro abre no sidebar ao entrar na seção', async ({ page }) => {
    await page.goto('/financeiro');
    // O submenu auto-abre via useEffect. Escopa ao nav para não colidir com links de conteúdo.
    const nav = page.locator('nav').first();
    await expect(nav.getByRole('link', { name: /lançamentos/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /relatórios/i })).toBeVisible();
  });

  test('navega pelas subpáginas do financeiro pelo sidebar', async ({ page }) => {
    await page.goto('/financeiro');
    const nav = page.locator('nav').first();

    await nav.getByRole('link', { name: /lançamentos/i }).click();
    await page.waitForURL('/financeiro/lancamentos');

    await nav.getByRole('link', { name: /relatórios/i }).click();
    await page.waitForURL('/financeiro/relatorios');
  });
});
