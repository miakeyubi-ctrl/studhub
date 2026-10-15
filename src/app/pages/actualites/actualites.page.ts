import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MockDataService, ServiceProvider } from '../../services/mock-data.service';
import { StudentMenuService } from '../../services/student-menu.service';
import { UploadService } from '../../services/upload.service';

interface Prestataire {
  id: number;
  name: string;
  profession: string;
  category: string;
  likes: number;
  comments: number;
  image: string;
  description: string;
  city: string;
  phone?: string;
  skills?: string[];
}

const SECTOR_TO_ENUM: Record<string, string> = {
  Développement: 'DEVELOPPEMENT_WEB',
  Design: 'GRAPHISME',
  Photographie: 'PHOTOGRAPHIE',
  Formation: 'COURS_PARTICULIERS',
  Réparation: 'REPARATION_PC',
};

const ENUM_TO_SECTOR: Record<string, string> = {
  DEVELOPPEMENT_WEB: 'Développement',
  GRAPHISME: 'Design',
  COURS_LANGUES: 'Formation',
  REPARATION_PC: 'Réparation',
  DESIGN_INTERIEUR: 'Design',
  PHOTOGRAPHIE: 'Photographie',
  COURS_PARTICULIERS: 'Formation',
  AUTRES: 'Autres',
};

@Component({
  selector: 'app-actualites',
  templateUrl: './actualites.page.html',
  styleUrls: ['./actualites.page.scss'],
  standalone: false,
})
export class ActualitesPage implements OnInit, OnDestroy {
  loading = true;
  searchTerm = '';
  selectedCategory = 'Tous';

  categories = ['Tous', 'Développement', 'Design', 'Photographie', 'Formation', 'Réparation'];
  sectors = this.categories.filter((c) => c !== 'Tous');

  prestataires: Prestataire[] = [];

  showProposeModal = false;
  proposeLoading = false;
  proposeError = '';

  proposeForm = {
    businessName: '',
    sector: '',
    phone: '',
    city: '',
    description: '',
    photoDataUrl: null as string | null,
    photoFile: null as File | null,
    skillInput: '',
    skills: [] as string[],
  };

  private sub?: Subscription;

  constructor(
    private toastController: ToastController,
    private translate: TranslateService,
    private data: MockDataService,
    private auth: AuthService,
    private upload: UploadService,
    private router: Router,
    private studentMenu: StudentMenuService,
  ) {}

  get menuInitial(): string {
    const name = this.auth.currentUser?.fullName?.trim();
    return name ? name.charAt(0).toUpperCase() : '';
  }

  openMenu(): void {
    this.studentMenu.open();
  }

  ngOnInit(): void {
    this.sub = this.data.providers$.subscribe((list) => {
      this.prestataires = list.map((p) => this.toUi(p));
    });
    void this.reload();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async reload(event?: CustomEvent): Promise<void> {
    this.loading = true;
    try {
      await this.data.loadProviders();
    } finally {
      this.loading = false;
      (event?.target as HTMLIonRefresherElement | undefined)?.complete?.();
    }
  }

  ionViewWillEnter(): void {
    void this.data.loadProviders();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
  }

  get filteredPrestataires(): Prestataire[] {
    return this.prestataires.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.profession.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory =
        this.selectedCategory === 'Tous' || item.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  openProposeModal(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.proposeError = '';
    this.proposeForm = {
      businessName: '',
      sector: '',
      phone: '',
      city: '',
      description: '',
      photoDataUrl: null,
      photoFile: null,
      skillInput: '',
      skills: [],
    };
    this.showProposeModal = true;
  }

  closeProposeModal(): void {
    this.showProposeModal = false;
  }

  addSkill(): void {
    const skill = this.proposeForm.skillInput.trim();
    if (!skill || this.proposeForm.skills.includes(skill)) return;
    this.proposeForm.skills.push(skill);
    this.proposeForm.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.proposeForm.skills = this.proposeForm.skills.filter((s) => s !== skill);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.proposeForm.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.proposeForm.photoDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async publishService(): Promise<void> {
    this.proposeError = '';

    const { businessName, sector, phone, city, description } = this.proposeForm;
    const cleanPhone = phone.replace(/\D/g, '');

    if (!businessName.trim() || !sector || !description.trim() || !cleanPhone || !city.trim()) {
      this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_REQUIRED';
      return;
    }

    if (cleanPhone.length !== 8) {
      this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_PHONE';
      return;
    }

    const category = SECTOR_TO_ENUM[sector] || 'AUTRES';
    this.proposeLoading = true;

    try {
      let portfolioUrls: string[] = [];
      if (this.proposeForm.photoFile) {
        const uploaded = await this.upload.uploadFile(this.proposeForm.photoFile, 'providers');
        if (uploaded?.url) portfolioUrls = [uploaded.url];
      }

      const created = await this.data.createProvider({
        category,
        title: businessName.trim(),
        bio: description.trim() + (this.proposeForm.skills.length
          ? `\n\nCompétences: ${this.proposeForm.skills.join(', ')}`
          : ''),
        phoneContact: '+216' + cleanPhone,
        city: city.trim(),
        portfolioUrls,
      });

      if (!created) {
        this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_FAILED';
        return;
      }

      this.showProposeModal = false;
      const toast = await this.toastController.create({
        message: this.translate.instant('SERVICES_PAGE.PROPOSE_SUCCESS'),
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    } catch {
      this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_FAILED';
    } finally {
      this.proposeLoading = false;
    }
  }

  private toUi(p: ServiceProvider): Prestataire {
    return {
      id: p.id,
      name: p.name,
      profession: p.profession,
      category: ENUM_TO_SECTOR[p.category] || p.category || 'Autres',
      likes: p.likes,
      comments: p.comments,
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=300&auto=format&fit=crop',
      description: p.description,
      city: p.city,
      phone: p.phone,
      skills: p.services?.length ? p.services : undefined,
    };
  }
}
