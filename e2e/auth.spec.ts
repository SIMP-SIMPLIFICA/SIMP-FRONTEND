import { test, expect } from '@playwright/test';

// Sobrescreve o storageState do projeto — todos os testes aqui rodam sem sessão
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Autenticação', () => {
  test('exibe página de login corretamente', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.getByPlaceholder('exemplo@prefeitura.gov.br')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar no Sistema' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Esqueceu a senha?' })).toBeVisible();
  });

  test('rota protegida redireciona para /login sem sessão', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  });

  test('credenciais inválidas exibem erro', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('exemplo@prefeitura.gov.br').fill('naoexiste@simp.gov.br');
    await page.getByPlaceholder('••••••••').fill('senhaerrada');
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

    // Toast de erro deve aparecer
    await expect(page.getByText('Falha no login').first()).toBeVisible({ timeout: 10_000 });
    // Permanece na página de login
    await expect(page).toHaveURL('/login');
  });

  test('login com credenciais válidas redireciona para dashboard', async ({ page }) => {
    await page.goto('/login');

    await page
      .getByPlaceholder('exemplo@prefeitura.gov.br')
      .fill(process.env.E2E_EMAIL || 'admin@example.com');
    await page
      .getByPlaceholder('••••••••')
      .fill(process.env.E2E_PASSWORD || 'Admin123!@#');

    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

    await page.waitForURL('/');
    await expect(page.getByText('Painel de Controle')).toBeVisible();
  });

  test('página de esqueci a senha carrega', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL('/forgot-password');
    // Verifica que há um input de e-mail na página
    await expect(page.getByRole('textbox')).toBeVisible();
  });
});
