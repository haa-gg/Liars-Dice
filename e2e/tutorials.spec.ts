import { expect, test, type Page } from '@playwright/test';

async function openTutorialFromMenu(page: Page, label: string) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: label }).click();
}

test.describe('tutorial flows', () => {
    test('quick play tutorial runs to completion', async ({ page }) => {
        await openTutorialFromMenu(page, 'Quick Play Tutorial');

        await expect(page.getByText("Captain's Advice")).toBeVisible();
        await expect(page.getByText("Click 'Start Round' down below to start the round!")).toBeVisible();

        await page.getByRole('button', { name: 'Start Round' }).click();
        await page.getByRole('button', { name: "Aye, Let's Begin!" }).click();

        await expect(page.getByText("It is Botbeard's turn.")).toBeVisible();
        await expect(page.getByText("It's your turn!")).toBeVisible({ timeout: 15_000 });

        await page.getByRole('button', { name: '+' }).click();
        await page.locator('select.input-nautical').last().selectOption('3');
        await page.getByRole('button', { name: 'Raise Bid' }).click();

        await expect(page.getByText("Now it's Mister Roboto's turn.")).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next Round' })).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: 'Next Round' }).click();

        await expect(page.getByRole('button', { name: 'New Table' })).toBeVisible();
    });

    test('expanded game tutorial runs to completion', async ({ page }) => {
        await openTutorialFromMenu(page, 'Expanded Game Tutorial');

        await expect(page.getByText('Full Game Tutorial: Honor System Cheats')).toBeVisible();
        await page.getByRole('button', { name: 'Got it' }).click();

        await expect(page.getByText('Start the match')).toBeVisible();
        await page.getByRole('button', { name: 'Start Round' }).click();
        await page.getByRole('button', { name: "Aye, Let's Begin!" }).click();

        await expect(page.getByText('The Cheat Panel')).toBeVisible();
        await page.getByRole('button', { name: 'Peek' }).click();

        await expect(page.getByText('Peek: Choose a Target')).toBeVisible();
        await page.getByRole('button', { name: 'Rook Ashveil', exact: true }).click();

        await expect(page.getByText('Peek: Private Reveal')).toBeVisible();
        await page.getByRole('button', { name: 'Continue →' }).click();

        await expect(page.getByText('Slip: Sleight of Hand')).toBeVisible();
        await page.getByRole('button', { name: 'Slip' }).click();

        await expect(page.getByText('Slip: Applied')).toBeVisible();
        await page.getByRole('button', { name: 'Continue →' }).click();
        await expect(page.getByText('Three More Cheats')).toBeVisible();
        await page.getByRole('button', { name: 'Continue →' }).click();
        await expect(page.getByText('Pro tip:')).toBeVisible();
        await page.getByRole('button', { name: 'Continue →' }).click();
        await expect(page.getByText("You're Ready!")).toBeVisible();
        await page.getByRole('button', { name: 'End Tutorial' }).click();

        await expect(page.getByRole('button', { name: 'New Table' })).toBeVisible();
    });
});
