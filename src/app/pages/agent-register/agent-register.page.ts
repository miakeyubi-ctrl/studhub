import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-agent-register',
  templateUrl: './agent-register.page.html',
  styleUrls: ['./agent-register.page.scss'],
  standalone: false,
})
export class AgentRegisterPage implements OnInit {

  fullName = '';
  agencyName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
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
