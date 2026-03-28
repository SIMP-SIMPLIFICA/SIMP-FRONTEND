import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/user.json');

setup('autenticar como admin', async ({ page }) => {
  // Garante que o diretório existe
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();

  await page
    .getByPlaceholder('exemplo@prefeitura.gov.br')
    .fill(process.env.E2E_EMAIL || 'admin@example.com');

  await page
    .getByPlaceholder('••••••••')
    .fill(process.env.E2E_PASSWORD || 'Admin123!@#');

  await page.getByRole('button', { name: 'Entrar no Sistema' }).click();

  // Aguarda redirect para o dashboard
  await page.waitForURL('/');
  await expect(page.getByText('Painel de Controle')).toBeVisible();

  // Salva o storageState (tokens no localStorage)
  await page.context().storageState({ path: authFile });
});
