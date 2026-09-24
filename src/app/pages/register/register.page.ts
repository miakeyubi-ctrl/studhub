import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  acceptTerms = false;

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
