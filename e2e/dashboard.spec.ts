import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('carrega o painel de controle', async ({ page }) => {
    await expect(page.getByText('Painel de Controle')).toBeVisible();
    await expect(page.getByText('Visão geral da administração municipal hoje.')).toBeVisible();
  });

  test('exibe os 4 cards de métricas', async ({ page }) => {
    await expect(page.getByText('RECEITAS (TOTAL)')).toBeVisible();
    await expect(page.getByText('DESPESAS (TOTAL)')).toBeVisible();
    await expect(page.getByText('OBRAS ATIVAS')).toBeVisible();
    await expect(page.getByText('SOLICITAÇÕES (SAC)')).toBeVisible();
  });

  test('sidebar está visível com itens de navegação', async ({ page }) => {
    await expect(page.getByText('SIMP')).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /workspaces/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /convênios/i })).toBeVisible();
  });

  test('topbar exibe nome e role do usuário', async ({ page }) => {
    // Aguarda o useMe carregar — admin user tem firstName "Admin" lastName "User"
    await expect(page.getByText('Admin User')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Administrator')).toBeVisible({ timeout: 10_000 });
  });

  test('navega para workspaces pelo sidebar', async ({ page }) => {
    await page.getByRole('link', { name: /workspaces/i }).click();
    await page.waitForURL('/workspaces');
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
  });
});
