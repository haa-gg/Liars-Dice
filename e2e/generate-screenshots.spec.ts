import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.resolve(process.cwd(), '../screenshots');

const viewports = [
    { name: 'mobile', width: 390, height: 844, suffix: '' },
    { name: '7tab', width: 600, height: 960, suffix: '-7tab' },
    { name: '10tab', width: 1024, height: 1366, suffix: '-10tab' }
];

test.describe('App Store Screenshots', () => {
    test.beforeAll(() => {
        if (!fs.existsSync(SCREENSHOTS_DIR)) {
            fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
        }
    });

    for (const vp of viewports) {
        test.describe(`Viewport: ${vp.name}`, () => {
            test.use({ viewport: { width: vp.width, height: vp.height } });

            test('Capture Lobby, Settings, Rules', async ({ page }) => {
                await page.goto('/');
                
                await page.getByPlaceholder('Captain Redbeard').fill('Pirate Bob');
                await page.getByRole('button', { name: 'New Table' }).click();
                
                await page.getByRole('button', { name: '+ Spawn Bot Player' }).click();
                await page.waitForTimeout(1000); 
                
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `lobby-shot${vp.suffix}.png`) });

                if (vp.name === 'mobile') {
                    await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `settings-shot.png`) });
                    await page.locator('.menu-backdrop').click({ position: { x: 10, y: 10 } }); 
                    await page.waitForTimeout(500);

                    await page.getByRole('button', { name: 'Open menu' }).click();
                    await page.getByRole('button', { name: 'Rules' }).click();
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `rules-shot.png`) });
                }
            });

            test('Capture Gameplay, Tricks, Winner', async ({ page }) => {
                await page.goto('/');
                
                await page.getByPlaceholder('Captain Redbeard').fill('Pirate Bob');
                await page.getByRole('button', { name: 'New Table' }).click();
                
                await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
                await page.locator('.settings-row').filter({ hasText: 'Honor System Cheats' }).locator('button').click();
                await page.locator('select.settings-select').first().selectOption('3'); // Starting Dice = 3
                await page.locator('select.settings-select').nth(1).selectOption('2'); // Eliminate at 2
                await page.locator('.menu-backdrop').click({ position: { x: 10, y: 10 } });
                await page.waitForTimeout(500);

                await page.getByRole('button', { name: '+ Spawn Bot Player' }).click();

                await page.getByRole('button', { name: 'Start Round' }).click();
                await page.getByRole('button', { name: "Aye, Let's Begin!" }).click();

                await expect(page.getByText(/turn/i)).toBeVisible({ timeout: 15000 });
                await page.waitForTimeout(1000);

                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `gameplay-shot${vp.suffix}.png`) });

                if (vp.name === 'mobile') {
                    // Open Tricks (Cheat info)
                    await page.getByRole('button', { name: 'Show cheat information' }).click();
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `tricks-shot.png`) });
                    await page.locator('.rules-overlay').click({ position: { x: 10, y: 10 } });
                    await page.waitForTimeout(500);
                }

            });
        });
    }
});
