import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {

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
