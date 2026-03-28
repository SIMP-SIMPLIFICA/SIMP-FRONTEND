import { test, expect } from '@playwright/test';

test.describe('Workspaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspaces');
    // Aguarda loading terminar antes de prosseguir
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible({ timeout: 10_000 });
  });

  test('exibe a página de workspaces', async ({ page }) => {
    await expect(page.getByText('Gerencie suas equipes e projetos.')).toBeVisible();
    await expect(page.getByRole('button', { name: /novo workspace/i })).toBeVisible();
  });

  test('abre o dialog de criar workspace', async ({ page }) => {
    await page.getByRole('button', { name: /novo workspace/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('textbox').first()).toBeVisible();
  });

  test('cria um workspace com sucesso', async ({ page }) => {
    const nome = `E2E Workspace ${Date.now()}`;

    await page.getByRole('button', { name: /novo workspace/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').first().fill(nome);

    // Botão de confirmar dentro do dialog
    await dialog.getByRole('button', { name: 'Criar Workspace' }).click();

    // Dialog fecha após criação
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // O workspace criado aparece na listagem
    await expect(page.getByText(nome)).toBeVisible({ timeout: 10_000 });
  });

  test('acessa o kanban de um workspace existente', async ({ page }) => {
    // WorkspaceCard renderiza como Card com classe "group" e texto "membros"
    const cards = page.locator('div.group').filter({ hasText: /membros/ });
    const count = await cards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await cards.first().click();
    await page.waitForURL(/\/workspaces\/.+/);
  });
});
