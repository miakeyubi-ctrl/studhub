import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-agent-login',
  templateUrl: './agent-login.page.html',
  styleUrls: ['./agent-login.page.scss'],
  standalone: false,
})
export class AgentLoginPage implements OnInit {

  email = '';
  password = '';
  showPassword = false;

  constructor(public theme: ThemeService) { }

  ngOnInit() {
  }

  goBack() {
    window.history.back();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
