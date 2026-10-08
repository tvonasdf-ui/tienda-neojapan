import { expect, test } from '@playwright/test';

test('adds the selected variant and supports cart quantity changes and removal', async ({ page }) => {
  await page.goto('/producto/joystick-repuesto-switch-oled');
  await expect(page.getByRole('heading', { name: 'Joystick de repuesto Switch OLED' })).toBeVisible();

  await page.getByRole('radio', { name: /Condición B SW-JOY-B1/ }).check();
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await expect(page.getByRole('button', { name: 'Agregado al carrito ✓' })).toBeVisible();

  await page.getByRole('link', { name: /Ver carrito/ }).click();
  await expect(page.getByRole('heading', { name: 'Carrito.' })).toBeVisible();
  await expect(page.locator('.cart-line')).toContainText('SW-JOY-B1');

  const quantity = page.locator('.quantity-control span');
  await expect(quantity).toHaveText('1');
  await page.getByRole('button', { name: 'Agregar una unidad' }).click();
  await expect(quantity).toHaveText('2');
  await page.getByRole('button', { name: 'Quitar una unidad' }).click();
  await expect(quantity).toHaveText('1');
  await page.getByRole('button', { name: 'Quitar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío.' })).toBeVisible();
});

test('keeps every active filter when a catalog search is submitted', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByLabel('Plataforma').selectOption({ label: 'Nintendo Switch' });
  await page.getByLabel('Categoría').selectOption({ label: 'Repuestos' });
  await page.getByLabel('Condición').selectOption('A');
  await page.getByLabel('Compatibilidad').selectOption({ label: 'Nintendo Switch OLED' });
  await page.getByLabel('Precio mínimo').fill('10000');
  await page.getByLabel('Precio máximo').fill('30000');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page).toHaveURL(/category=Repuestos/);

  await page.getByRole('searchbox', { name: 'Buscar producto o consola' }).fill('Joystick');
  await page.getByRole('button', { name: 'Buscar' }).click();

  const query = new URL(page.url()).searchParams;
  expect(query.get('q')).toBe('Joystick');
  expect(query.get('platform')).toBe('Nintendo Switch');
  expect(query.get('category')).toBe('Repuestos');
  expect(query.get('condition')).toBe('A');
  expect(query.get('compatibleConsoleId')).toBeTruthy();
  expect(query.get('minPrice')).toBe('10000');
  expect(query.get('maxPrice')).toBe('30000');
  await expect(page.getByRole('link', { name: 'Ver Joystick de repuesto Switch OLED' })).toBeVisible();
});
