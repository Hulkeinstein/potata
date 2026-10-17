import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { accountTranslations, accountMessage } from './account-messages';
const files = ['app/mypage/page.tsx', 'app/mypage/settings/page.tsx', 'app/mypage/benefits/page.tsx', 'components/settings/UserSettingsForm.tsx', 'components/benefits/BenefitsClient.tsx', 'components/liked/LikedClient.tsx', 'app/notifications/page.tsx', 'components/notifications/NotificationListItem.tsx', 'components/profile/FollowButton.tsx', 'components/profile/HandleSetupBanner.tsx', 'components/mypage/MyPostsClient.tsx', 'components/mypage/OOTDPostCard.tsx', 'components/mypage/ProductPostCard.tsx', 'components/product/ReviewSection.tsx', 'components/product/QASection.tsx'];
it('covers every literal account and product community translation call', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\("([^"]+)"\)/g)) expect(accountTranslations[match[1] ?? ''], `${file}: ${match[1]}`).toBeTruthy();
  }
});
it('maps pending state messages live and preserves untranslated personal text', () => {
  expect(accountMessage('en', '설정을 저장했습니다.')).toBe('Settings saved.');
  expect(accountMessage('ko', '설정을 저장했습니다.')).toBe('설정을 저장했습니다.');
  expect(accountMessage('en', 'Jane')).toBe('Jane');
});
