import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { AgentAuthService, RealEstateAgent } from '../services/agent-auth.service';
import { AgentMenuService } from '../services/agent-menu.service';
import { AgentProperty, AgentPropertiesService, PROPERTY_PHOTO_PLACEHOLDER } from '../services/agent-properties.service';
import { UploadService } from '../services/upload.service';

const NO_PHOTO_PLACEHOLDER = PROPERTY_PHOTO_PLACEHOLDER;

interface PhotoPreview {
  localFile?: File;
  url: string;
  isUploading?: boolean;
  progress?: number;
  error?: string;
}

@Component({
  selector: 'app-agent-tab-gestion',
  templateUrl: './agent-tab-gestion.page.html',
  styleUrls: ['./agent-tab-gestion.page.scss'],
  standalone: false,
})
export class AgentTabGestionPage implements OnInit {

  agent!: RealEstateAgent;
  properties: AgentProperty[] = [];
  menuInitial = '';

  categories = ['Studios', 'Colocations', 'Résidences', 'Chambres'];

  showFormModal = false;
  editingId: number | null = null;
  formLoading = false;
  formUploading = false;
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
    latitude: null as number | null,
    longitude: null as number | null,
    photos: [] as PhotoPreview[],
  };

  constructor(
    private agentAuth: AgentAuthService,
    private agentProperties: AgentPropertiesService,
    private agentMenu: AgentMenuService,
    private alertController: AlertController,
    private toastController: ToastController,
    private translate: TranslateService,
    private uploadService: UploadService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
  ) { }

  ngOnInit(): void {
    this.agent = this.agentAuth.currentAgentOrGuest;
    this.updateMenuInitial();
    void this.refreshProperties().then(() => this.handleQueryActions());
    this.route.queryParamMap.subscribe(() => {
      void this.handleQueryActions();
    });
  }

  openMenu(): void {
    this.agentMenu.open();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/agent-dashboard/dashboard');
  }

  private updateMenuInitial(): void {
    const label = this.agent?.agencyName?.trim() || this.agent?.fullName?.trim() || this.agent?.email || '';
    this.menuInitial = label ? label.charAt(0).toUpperCase() : '';
  }

  ionViewWillEnter(): void {
    void this.refreshProperties();
  }

  private async handleQueryActions(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const openAdd = params.get('open') === 'add';
    const editId = Number(params.get('edit'));

    if (openAdd) {
      this.openAddModal();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
      return;
    }

    if (editId && !Number.isNaN(editId)) {
      if (!this.properties.length) {
        await this.refreshProperties();
      }
      const property = this.properties.find(p => p.id === editId)
        || await this.agentProperties.getById(editId);
      // Voter-like : seule l'annonce de l'agent connecté est modifiable
      if (property && String(property.agentId) === String(this.agent.id)) {
        this.openEditModal(property);
      }
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  photoSrc(property: AgentProperty): string {
    return this.agentProperties.resolvePhotoUrl(property.image);
  }

  onPhotoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.startsWith('data:image/svg+xml')) {
      img.src = NO_PHOTO_PLACEHOLDER;
    }
  }

  private async refreshProperties(): Promise<void> {
    this.properties = await this.agentProperties.getByAgent(this.agent.id);
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
      latitude: null,
      longitude: null,
      photos: [],
    };
    this.showFormModal = true;
  }

  viewProperty(property: AgentProperty): void {
    void this.router.navigate(['/detailsimmo', property.id]);
  }

  openEditModal(property: AgentProperty): void {
    if (String(property.agentId) !== String(this.agent.id)) {
      return;
    }
    this.editingId = property.id;
    this.formError = '';
    const imageUrls: string[] = (Array.isArray(property.images) && property.images.length > 0)
      ? property.images
      : property.image && property.image !== NO_PHOTO_PLACEHOLDER ? [property.image] : [];
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
      latitude: property.latitude ?? null,
      longitude: property.longitude ?? null,
      photos: imageUrls.map(url => ({ url })),
    };
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file): PhotoPreview => ({
      localFile: file,
      url: URL.createObjectURL(file),
    }));
    this.form.photos = [...this.form.photos, ...added].slice(0, 10);
    input.value = '';
  }

  removePhotoAt(index: number): void {
    const p = this.form.photos[index];
    if (p?.url?.startsWith('blob:')) URL.revokeObjectURL(p.url);
    this.form.photos.splice(index, 1);
  }

  private async uploadPendingPhotos(): Promise<string[]> {
    const pending = this.form.photos.filter(p => !!p.localFile);
    if (pending.length === 0) {
      return this.form.photos.map(p => p.url).filter(u => !!u);
    }
    this.formUploading = true;
    pending.forEach(p => { p.isUploading = true; p.progress = 0; p.error = undefined; });
    try {
      const urls: string[] = [];
      for (const preview of pending) {
        if (!preview.localFile) continue;
        preview.progress = 15;
        try {
          const uploaded = await this.uploadService.uploadFile(preview.localFile, 'properties');
          preview.progress = 100;
          preview.url = uploaded.url;
          preview.isUploading = false;
          urls.push(uploaded.url);
        } catch (err: any) {
          preview.error = (err && err.message) ? String(err.message) : 'UPLOAD.ERROR';
          preview.isUploading = false;
          throw new Error(preview.error);
        }
      }
      const uploadedUrls = this.form.photos.map(p => p.url).filter(u => !!u && !u.startsWith('blob:'));
      return uploadedUrls;
    } finally {
      this.formUploading = false;
    }
  }

  async savePropertyForm(): Promise<void> {
    this.formError = '';

    const { title, category, city, address, price, surface, rooms } = this.form;

    if (!title.trim() || !category || !city.trim() || !address.trim() || !price || price <= 0 || !surface || !rooms) {
      this.formError = 'AGENT_DASHBOARD.ERROR_REQUIRED';
      return;
    }

    this.formLoading = true;
    let uploadedImageUrls: string[] = [];
    try {
      uploadedImageUrls = await this.uploadPendingPhotos();
    } catch (err: any) {
      this.formLoading = false;
      this.formError = (err && err.message) ? String(err.message) : 'UPLOAD.ERROR';
      return;
    }
    const realUrls = uploadedImageUrls.filter(u => !!u && !u.startsWith('blob:') && !u.startsWith('data:'));
    const mainImage = realUrls[0] || NO_PHOTO_PLACEHOLDER;

    try {
      const payload: any = {
        title: title.trim(),
        category,
        city: city.trim(),
        address: address.trim(),
        price,
        surface,
        rooms,
        furnished: this.form.furnished,
        description: this.form.description.trim(),
        image: mainImage,
        images: realUrls,
      };
      if (this.form.latitude != null && this.form.longitude != null) {
        payload.latitude = Number(this.form.latitude);
        payload.longitude = Number(this.form.longitude);
      }

      if (this.editingId !== null) {
        await this.agentProperties.update(this.editingId, payload);
      } else {
        await this.agentProperties.add(payload);
      }

      await this.refreshProperties();
      this.formLoading = false;
      this.showFormModal = false;

      const toast = await this.toastController.create({
        message: this.translate.instant(this.editingId !== null ? 'AGENT_DASHBOARD.SUCCESS_UPDATED' : 'AGENT_DASHBOARD.SUCCESS_PUBLISHED'),
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (err: any) {
      this.formLoading = false;
      this.formError = (err && err.message) ? String(err.message) : 'AGENT_DASHBOARD.ERROR_SAVE';
    }
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
    await this.agentProperties.delete(id);
    await this.refreshProperties();

    const toast = await this.toastController.create({
      message: this.translate.instant('AGENT_DASHBOARD.SUCCESS_DELETED'),
      duration: 2000,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}

