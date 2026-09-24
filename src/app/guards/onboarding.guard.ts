import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const ONBOARDING_SEEN_KEY = 'studhub-onboarding-seen';

export const onboardingGuard: CanActivateFn = () => {
  const alreadySeen = localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';

  if (alreadySeen) {
    return inject(Router).parseUrl('/tabs/tab1');
  }

  return true;
};
