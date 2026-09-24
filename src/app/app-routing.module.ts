import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { onboardingGuard } from './guards/onboarding.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule)
  },
  {
    path: 'verify-code',
    loadChildren: () => import('./pages/verify-code/verify-code.module').then( m => m.VerifyCodePageModule)
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./pages/reset-password/reset-password.module').then( m => m.ResetPasswordPageModule)
  },
  {
    path: 'edit-profile',
    loadChildren: () => import('./pages/edit-profile/edit-profile.module').then( m => m.EditProfilePageModule)
  },
  {
    path: 'actualites',
    loadChildren: () => import('./pages/actualites/actualites.module').then( m => m.ActualitesPageModule)
  },
  {
    path: 'feed',
    loadChildren: () => import('./pages/feed/feed.module').then( m => m.FeedPageModule)
  },
  {
    path: 'messages',
    loadChildren: () => import('./pages/messages/messages.module').then( m => m.MessagesPageModule)
  },
  {
    path: 'messages/:id',
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
    path: 'detailsproduit/:id',
    loadChildren: () => import('./pages/detailsproduit/detailsproduit.module').then( m => m.DetailsproduitPageModule)
  },
  {
    path: 'detailsstudservices/:id',
    loadChildren: () => import('./pages/detailsstudservices/detailsstudservices.module').then( m => m.DetailsstudservicesPageModule)
  },
  {
    path: 'agent-login',
    loadChildren: () => import('./pages/agent-login/agent-login.module').then( m => m.AgentLoginPageModule)
  },
  {
    path: 'agent-register',
    loadChildren: () => import('./pages/agent-register/agent-register.module').then( m => m.AgentRegisterPageModule)
  },
  {
    path: 'agent-dashboard',
    loadChildren: () => import('./agent-tabs/agent-tabs.module').then( m => m.AgentTabsPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
