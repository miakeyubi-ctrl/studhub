import { Component, OnInit, OnDestroy } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { AgentAuthService } from '../../services/agent-auth.service';
import { PartnerAuthService } from '../../services/partner-auth.service';
import { ActiveRoleService } from '../../services/active-role.service';
import { Router } from '@angular/router';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-agent-login',
  templateUrl: './agent-login.page.html',
  styleUrls: ['./agent-login.page.scss'],
  standalone: false,
})
export class AgentLoginPage implements OnInit, OnDestroy {

  email = '';
  password = '';
  showPassword = false;

  connectedName: string | null = null;
  connectedRole: 'student' | 'agent' | 'partner' | null = null;
  isLoggedIn = false;
  private sub?: Subscription;
  private agSub?: Subscription;
  private pSub?: Subscription;
  private loading?: HTMLIonLoadingElement;

  constructor(
    public theme: ThemeService,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private partnerAuth: PartnerAuthService,
    private activeRole: ActiveRoleService,
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
  ) { }

  ngOnInit() {
    this.refresh();
    this.sub = this.auth.user$.subscribe(() => this.refresh());
    this.agSub = this.agentAuth.agent$.subscribe(() => this.refresh());
    this.pSub = this.partnerAuth.partner$.subscribe(() => this.refresh());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.agSub?.unsubscribe();
    this.pSub?.unsubscribe();
  }

  private refresh(): void {
    const a = this.agentAuth.currentAgent;
    const s = this.auth.currentUser;
    const p = this.partnerAuth.currentPartner;
    if (a) {
      this.connectedName = this.pp(a.fullName, a.email);
      this.connectedRole = 'agent';
      this.isLoggedIn = true;
      return;
    }
    if (s) {
      this.connectedName = this.pp(s.fullName, s.email);
      this.connectedRole = 'student';
      this.isLoggedIn = true;
      return;
    }
    if (p) {
      this.connectedName = p.name || p.email;
      this.connectedRole = 'partner';
      this.isLoggedIn = true;
      return;
    }
    this.connectedName = null;
    this.connectedRole = null;
    this.isLoggedIn = false;
  }

  private pp(fullName?: string | null, email?: string | null): string {
    if (fullName && fullName.trim()) return fullName.trim();
    if (email) return email.split('@')[0];
    return 'Visiteur';
  }

  goBack() {
    window.history.back();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async logout() {
    this.auth.logout();
    this.agentAuth.logout();
    this.partnerAuth.logout();
    this.toast('AUTH.LOGGED_OUT', 'success');
  }

  goStudentLogin() {
    void this.navCtrl.navigateRoot('/login', { animated: true, animationDirection: 'back' });
  }

  goAgentLogin() {
    void this.navCtrl.navigateRoot('/agent-login', { animated: true, animationDirection: 'forward' });
  }

  goPartnerLogin() {
    void this.navCtrl.navigateRoot('/partner-login', { animated: true, animationDirection: 'forward' });
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.toast('AUTH.FILL_ALL_FIELDS', 'warning');
      return;
    }
    this.loading = await this.loadingCtrl.create({ message: this.translate.instant('AUTH.LOGGING_IN') });
    await this.loading.present();
    try {
      const res = await this.agentAuth.login(this.email.trim().toLowerCase(), this.password);
      await this.loading?.dismiss();
      if (res.success) {
        this.activeRole.set('agent');
        this.toast('AUTH.LOGIN_SUCCESS', 'success');
        setTimeout(() => this.router.navigateByUrl('/agent-dashboard/dashboard', { replaceUrl: true }), 250);
      } else {
        this.toast(res.message || 'AUTH.LOGIN_FAILED', 'danger');
      }
    } catch (e) {
      await this.loading?.dismiss();
      this.toast('AUTH.NETWORK_ERROR', 'danger');
    }
  }

  private async toast(key: string, color: 'success' | 'danger' | 'warning') {
    const t = await this.toastCtrl.create({
      message: this.translate.instant(key),
      duration: 2500,
      color,
      position: 'top',
    });
    await t.present();
  }
}
