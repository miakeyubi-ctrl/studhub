import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { AgentProperty, AgentPropertiesService } from '../services/agent-properties.service';

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>" +
  "<rect width='400' height='300' fill='%23EFFBFC'/>" +
  "<g fill='%2356C8D1' opacity='0.35'>" +
  "<circle cx='140' cy='110' r='28'/>" +
  "<path d='M40 260 L160 150 L230 210 L280 160 L360 260 Z'/>" +
  "</g></svg>";

@Component({
  selector: 'app-agent-tab-gestion',
  templateUrl: './agent-tab-gestion.page.html',
  styleUrls: ['./agent-tab-gestion.page.scss'],
  standalone: false,
})
export class AgentTabGestionPage implements OnInit {

  agent!: RealEstateAgent;
  properties: AgentProperty[] = [];

  categories = ['Studios', 'Colocations', 'Résidences', 'Chambres'];

  showFormModal = false;
  editingId: number | null = null;
  formLoading = false;
  formError = '';

  form = {
    title: '',
    category: '',
    city: '',
    address: '',
    price: null as number | null,
    surface: null as number | null,
    rooms: null as number | null,
    furnished: false,
    description: '',
    photoDataUrl: null as string | null
  };

  constructor(
    private agentAuth: AgentAuthService,
    private agentProperties: AgentPropertiesService,
    private alertController: AlertController,
    private toastController: ToastController,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.agent = this.agentAuth.currentAgentOrGuest;
    this.refreshProperties();
  }

  ionViewWillEnter(): void {
    this.refreshProperties();
  }

  private refreshProperties(): void {
    this.properties = this.agentProperties.getByAgent(this.agent.id);
  }

  openAddModal(): void {
    this.editingId = null;
    this.formError = '';
    this.form = {
      title: '',
      category: '',
      city: '',
      address: '',
      price: null,
      surface: null,
      rooms: null,
      furnished: false,
      description: '',
      photoDataUrl: null
    };
    this.showFormModal = true;
  }

  openEditModal(property: AgentProperty): void {
    this.editingId = property.id;
    this.formError = '';
    this.form = {
      title: property.title,
      category: property.category,
      city: property.city,
      address: property.address,
      price: property.price,
      surface: property.surface,
      rooms: property.rooms,
      furnished: property.furnished,
      description: property.description,
      photoDataUrl: property.image === NO_PHOTO_PLACEHOLDER ? null : property.image
    };
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.form.photoDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async savePropertyForm(): Promise<void> {
    this.formError = '';

    const { title, category, city, address, price, surface, rooms } = this.form;

    if (!title.trim() || !category || !city.trim() || !address.trim() || !price || price <= 0 || !surface || !rooms) {
      this.formError = 'AGENT_DASHBOARD.ERROR_REQUIRED';
      return;
    }

    this.formLoading = true;

    const payload = {
      agentId: this.agent.id,
      title: title.trim(),
      category,
      city: city.trim(),
      address: address.trim(),
      price,
      surface,
      rooms,
      furnished: this.form.furnished,
      description: this.form.description.trim(),
      image: this.form.photoDataUrl || NO_PHOTO_PLACEHOLDER
    };

    if (this.editingId !== null) {
      this.agentProperties.update(this.editingId, payload);
    } else {
      this.agentProperties.add(payload);
    }

    this.refreshProperties();
    this.formLoading = false;
    this.showFormModal = false;

    const toast = await this.toastController.create({
      message: this.translate.instant(this.editingId !== null ? 'AGENT_DASHBOARD.SUCCESS_UPDATED' : 'AGENT_DASHBOARD.SUCCESS_PUBLISHED'),
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }

  async confirmDelete(property: AgentProperty): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('AGENT_DASHBOARD.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('AGENT_DASHBOARD.DELETE_CONFIRM_MESSAGE', { title: property.title }),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('COMMON.DELETE'),
          role: 'destructive',
          handler: () => this.deleteProperty(property.id)
        }
      ]
    });
    await alert.present();
  }

  private async deleteProperty(id: number): Promise<void> {
    this.agentProperties.delete(id);
    this.refreshProperties();

    const toast = await this.toastController.create({
      message: this.translate.instant('AGENT_DASHBOARD.SUCCESS_DELETED'),
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
