import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

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

@Component({
  selector: 'app-actualites',
  templateUrl: './actualites.page.html',
  styleUrls: ['./actualites.page.scss'],
  standalone: false
})
export class ActualitesPage implements OnInit {

  loading = true;

  searchTerm = '';
  selectedCategory = 'Tous';

  categories = [
    'Tous',
    'Développement',
    'Design',
    'Photographie',
    'Formation',
    'Réparation'
  ];

  sectors = this.categories.filter(c => c !== 'Tous');

  prestataires: Prestataire[] = [
    {
      id: 1,
      name: 'Ahmed Sassi',
      profession: 'Développeur mobile',
      category: 'Développement',
      likes: 128,
      comments: 24,
      image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300&auto=format&fit=crop',
      description: 'Développement d\'applications Android & iOS pour étudiants et startups.',
      city: 'Tunis'
    },
    {
      id: 2,
      name: 'Mariem Chaabane',
      profession: 'Graphiste',
      category: 'Design',
      likes: 94,
      comments: 17,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop',
      description: 'Logos, affiches et identité visuelle pour projets étudiants.',
      city: 'Sousse'
    },
    {
      id: 3,
      name: 'Firas Bouazizi',
      profession: 'Photographe',
      category: 'Photographie',
      likes: 61,
      comments: 9,
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
      description: 'Shooting photo pour événements étudiants et portraits.',
      city: 'Sfax'
    },
    {
      id: 4,
      name: 'Ines Gharbi',
      profession: 'Formatrice en langues',
      category: 'Formation',
      likes: 143,
      comments: 31,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop',
      description: 'Cours particuliers d\'anglais et de français pour étudiants.',
      city: 'Ariana'
    },
    {
      id: 5,
      name: 'Walid Trabelsi',
      profession: 'Réparateur informatique',
      category: 'Réparation',
      likes: 77,
      comments: 12,
      image: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?q=80&w=300&auto=format&fit=crop',
      description: 'Réparation d\'ordinateurs et de téléphones, dépannage rapide.',
      city: 'Monastir'
    }
  ];

  showProposeModal = false;
  proposeLoading = false;
  proposeError = '';

  proposeForm = {
    businessName: '',
    sector: '',
    phone: '',
    description: '',
    photoDataUrl: null as string | null,
    skillInput: '',
    skills: [] as string[]
  };

  constructor(
    private toastController: ToastController,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    setTimeout(() => this.loading = false, 900);
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value;
  }

  get filteredPrestataires(): Prestataire[] {
    return this.prestataires.filter(item => {

      const matchesSearch =
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.profession.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'Tous' ||
        item.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  openProposeModal() {
    this.proposeError = '';
    this.proposeForm = {
      businessName: '',
      sector: '',
      phone: '',
      description: '',
      photoDataUrl: null,
      skillInput: '',
      skills: []
    };
    this.showProposeModal = true;
  }

  closeProposeModal() {
    this.showProposeModal = false;
  }

  addSkill(): void {
    const skill = this.proposeForm.skillInput.trim();
    if (!skill || this.proposeForm.skills.includes(skill)) return;

    this.proposeForm.skills.push(skill);
    this.proposeForm.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.proposeForm.skills = this.proposeForm.skills.filter(s => s !== skill);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.proposeForm.photoDataUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async publishService() {
    this.proposeError = '';

    const { businessName, sector, phone, description } = this.proposeForm;
    const cleanPhone = phone.replace(/\D/g, '');

    if (!businessName.trim() || !sector || !description.trim() || !cleanPhone) {
      this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_REQUIRED';
      return;
    }

    if (cleanPhone.length !== 8) {
      this.proposeError = 'SERVICES_PAGE.PROPOSE_ERROR_PHONE';
      return;
    }

    this.proposeLoading = true;

    const newPrestataire: Prestataire = {
      id: Math.max(...this.prestataires.map(p => p.id), 0) + 1,
      name: businessName.trim(),
      profession: sector,
      category: sector,
      likes: 0,
      comments: 0,
      image: this.proposeForm.photoDataUrl || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=300&auto=format&fit=crop',
      description: description.trim(),
      city: '',
      phone: '+216 ' + cleanPhone,
      skills: this.proposeForm.skills.length ? [...this.proposeForm.skills] : undefined
    };

    this.prestataires = [newPrestataire, ...this.prestataires];
    this.proposeLoading = false;
    this.showProposeModal = false;

    const toast = await this.toastController.create({
      message: this.translate.instant('SERVICES_PAGE.PROPOSE_SUCCESS'),
      duration: 2500,
      color: 'success',
      position: 'top'
    });
    await toast.present();
  }
}
