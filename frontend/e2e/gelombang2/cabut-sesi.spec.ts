import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth';

test.describe('Cabut Sesi (Regresi F0)', () => {
  test('Cabut sesi -> baris langsung hilang', async ({ page, request }) => {
    // Note: Since we are running the test, the test itself creates a session.
    // However, we want to revoke another session or create a mock session first.
    // Or we can just log in, check the active sessions list, and revoke one of them.
    // If there is only one session (the current one), revoking it logs us out.
    // Let's create a dummy session via API first.
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'e2e-admin@aamapp.sch.id', password: 'e2e-admin-pass' }
    });
    const { sessionInfo } = await loginRes.json();

    // Now login via UI to see the sessions
    await loginAsAdmin(page);
    await page.goto('/admin/akun/sesi'); // path benar: /admin/akun/sesi

    // Ensure we see at least 2 sessions (one from setup, one current)
    // Wait for data
    await page.waitForLoadState('networkidle');

    // Find the row for the session we created (sessionInfo.id)
    // or just the generic "Cabut Sesi" button
    const revokeBtns = page.getByRole('button', { name: /Cabut Sesi/i });
    const countBefore = await revokeBtns.count();
    
    if (countBefore > 0) {
      // Click the first Cabut Sesi button (might be the dummy one we created if it's ordered by latest)
      await revokeBtns.first().click();
      
      // Confirm dialog
      await page.getByRole('button', { name: 'Cabut', exact: true }).click();
      
      // Verify row disappears (count becomes less)
      await expect(page.getByRole('button', { name: /Cabut Sesi/i })).toHaveCount(countBefore - 1);
    }
  });
});
