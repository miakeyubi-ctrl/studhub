import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { onboardingGuard } from './guards/onboarding.guard';
import { roleGuard } from './guards/role.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'login',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule)
  },
  {
    path: 'verify-code',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/verify-code/verify-code.module').then( m => m.VerifyCodePageModule)
  },
  {
    path: 'reset-password',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/reset-password/reset-password.module').then( m => m.ResetPasswordPageModule)
  },
  {
    path: 'edit-profile',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/edit-profile/edit-profile.module').then( m => m.EditProfilePageModule)
  },
  {
    path: 'agent-edit-profile',
    canActivate: [roleGuard],
    data: { role: 'agent' },
    loadChildren: () => import('./pages/agent-edit-profile/agent-edit-profile.module').then(m => m.AgentEditProfilePageModule)
  },
  {
    path: 'notifications',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/notifications/notifications.module').then(m => m.NotificationsPageModule)
  },
  {
    path: 'help-support',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/help-support/help-support.module').then(m => m.HelpSupportPageModule)
  },
  {
    path: 'my-reports',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/my-reports/my-reports.module').then(m => m.MyReportsPageModule)
  },
  {
    path: 'privacy-security',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/privacy-security/privacy-security.module').then(m => m.PrivacySecurityPageModule)
  },
  {
    path: 'actualites',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/actualites/actualites.module').then( m => m.ActualitesPageModule)
  },
  {
    path: 'feed',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/feed/feed.module').then( m => m.FeedPageModule)
  },
  {
    path: 'messages',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/messages/messages.module').then( m => m.MessagesPageModule)
  },
  {
    path: 'messages/:id',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/messages/conversation/conversation.module').then( m => m.ConversationPageModule)
  },
  {
    path: 'onbroading',
    canActivate: [onboardingGuard],
    loadChildren: () => import('./pages/onbroading/onbroading.module').then( m => m.OnbroadingPageModule)
  },
  {
    path: 'detailsimmo/:id',
    loadChildren: () => import('./pages/detailsimmo/detailsimmo.module').then( m => m.DetailsimmoPageModule)
  },
  {
    path: 'agent-profile/:id',
    loadChildren: () => import('./pages/agent-profile/agent-profile.module').then( m => m.AgentProfilePageModule)
  },
  {
    path: 'nearby',
    loadChildren: () => import('./pages/nearby/nearby.module').then( m => m.NearbyPageModule)
  },
  {
    path: 'campus-map',
    loadChildren: () => import('./pages/campus-map/campus-map.module').then(m => m.CampusMapPageModule)
  },
  {
    path: 'favorites',
    canActivate: [roleGuard],
    data: { role: 'auth' },
    loadChildren: () => import('./pages/favorites/favorites.module').then( m => m.FavoritesPageModule)
  },
  {
    path: 'detailsproduit/:id',
    loadChildren: () => import('./pages/detailsproduit/detailsproduit.module').then( m => m.DetailsproduitPageModule)
  },
  {
    path: 'detailsstudservices/:id',
    loadChildren: () => import('./pages/detailsstudservices/detailsstudservices.module').then( m => m.DetailsstudservicesPageModule)
  },
  {
    path: 'partners',
    loadChildren: () => import('./pages/partners/partners.module').then( m => m.PartnersPageModule)
  },
  {
    path: 'partners/:id',
    loadChildren: () => import('./pages/partner-details/partner-details.module').then( m => m.PartnerDetailsPageModule)
  },
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'admin' },
    loadChildren: () => import('./pages/admin-home/admin-home.module').then(m => m.AdminHomePageModule)
  },
  {
    path: 'admin/partners',
    canActivate: [roleGuard],
    data: { role: 'admin' },
    loadChildren: () => import('./pages/admin-partners/admin-partners.module').then( m => m.AdminPartnersPageModule)
  },
  {
    path: 'admin/accounts',
    canActivate: [roleGuard],
    data: { role: 'admin' },
    loadChildren: () => import('./pages/admin-accounts/admin-accounts.module').then(m => m.AdminAccountsPageModule)
  },
  {
    path: 'agent-login',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/agent-login/agent-login.module').then( m => m.AgentLoginPageModule)
  },
  {
    path: 'agent-register',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/agent-register/agent-register.module').then( m => m.AgentRegisterPageModule)
  },
  {
    path: 'agent-dashboard',
    canActivate: [roleGuard],
    data: { role: 'agent' },
    loadChildren: () => import('./agent-tabs/agent-tabs.module').then( m => m.AgentTabsPageModule)
  },
  {
    path: 'partner-login',
    canActivate: [roleGuard],
    data: { role: 'guest' },
    loadChildren: () => import('./pages/partner-login/partner-login.module').then(m => m.PartnerLoginPageModule)
  },
  {
    path: 'partner-dashboard',
    canActivate: [roleGuard],
    data: { role: 'partner' },
    loadChildren: () => import('./pages/partner-dashboard/partner-dashboard.module').then(m => m.PartnerDashboardPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
