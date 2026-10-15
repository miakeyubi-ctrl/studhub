import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { FeedPost, MockDataService } from '../../services/mock-data.service';
import { StudentMenuService } from '../../services/student-menu.service';
import { UploadService } from '../../services/upload.service';

interface UiFeedPost {
  id: number;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  image: string | null;
  description: string;
  likes: number;
  comments: number;
  liked: boolean;
  expanded: boolean;
  timeAgo: string;
  showComments?: boolean;
  commentsLoading?: boolean;
  commentDraft?: string;
  commentSending?: boolean;
  commentsList?: { id: number; authorName: string; text: string }[];
}

@Component({
  selector: 'app-feed',
  templateUrl: './feed.page.html',
  styleUrls: ['./feed.page.scss'],
  standalone: false,
})
export class FeedPage implements OnInit, OnDestroy {
  loading = true;
  searchTerm = '';
  posts: UiFeedPost[] = [];

  showComposeModal = false;
  composeLoading = false;
  composeError = '';
  composeForm = {
    text: '',
    associationTag: '',
    photoDataUrl: null as string | null,
    photoFile: null as File | null,
  };

  private sub?: Subscription;

  constructor(
    private data: MockDataService,
    private auth: AuthService,
    private upload: UploadService,
    private toastCtrl: ToastController,
    private translate: TranslateService,
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
    this.sub = this.data.posts$.subscribe((list) => {
      // Préserver showComments / draft / expanded sinon le panneau se ferme
      // dès que loadComments met à jour posts$.
      this.posts = list.map((p) => this.toUi(p, this.posts.find((x) => x.id === p.id)));
    });
    void this.reload();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async reload(event?: CustomEvent): Promise<void> {
    this.loading = true;
    try {
      await this.data.loadPosts({ limit: 100 });
    } finally {
      this.loading = false;
      (event?.target as HTMLIonRefresherElement | undefined)?.complete?.();
    }
  }

  ionViewWillEnter(): void {
    void this.data.loadPosts({ limit: 100 });
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
  }

  get filteredPosts(): UiFeedPost[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.posts;
    return this.posts.filter(
      (post) =>
        post.authorName.toLowerCase().includes(term) ||
        post.authorRole.toLowerCase().includes(term) ||
        post.description.toLowerCase().includes(term),
    );
  }

  async toggleLike(post: UiFeedPost): Promise<void> {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const updated = await this.data.toggleLikePost(post.id);
    const live = this.posts.find((p) => p.id === post.id);
    if (updated && live) {
      live.liked = !!updated.likedByMe;
      live.likes = updated.likesCount;
    }
  }

  async toggleComments(post: UiFeedPost): Promise<void> {
    const postId = post.id;
    const current = this.posts.find((p) => p.id === postId) || post;
    current.showComments = !current.showComments;
    if (!current.showComments) return;

    current.commentsLoading = true;
    try {
      const list = await this.data.loadComments(postId);
      // posts$ a pu recréer l'objet : on reprend la référence live
      const live = this.posts.find((p) => p.id === postId);
      if (!live) return;
      live.showComments = true;
      live.commentsList = list.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        text: c.text,
      }));
      live.comments = list.length;
      live.commentsLoading = false;
    } catch {
      const live = this.posts.find((p) => p.id === postId);
      if (live) live.commentsLoading = false;
    }
  }

  async sendComment(post: UiFeedPost): Promise<void> {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    const postId = post.id;
    const live = this.posts.find((p) => p.id === postId) || post;
    if (live.commentSending) return; // anti double-clic / double Enter

    const text = (live.commentDraft || '').trim();
    if (!text) return;

    live.commentSending = true;
    live.commentDraft = ''; // vider tout de suite pour éviter un 2e envoi du même texte
    try {
      const created = await this.data.addComment(postId, text);
      const target = this.posts.find((p) => p.id === postId);
      if (!target) return;

      target.showComments = true;
      // posts$ a souvent déjà injecté le commentaire via toUi — n'ajouter que s'il manque
      if (created && !(target.commentsList || []).some((c) => c.id === created.id)) {
        target.commentsList = [
          ...(target.commentsList || []),
          {
            id: created.id,
            authorName: created.authorName,
            text: created.text,
          },
        ];
      }
      // dédupliquer au cas où (même id ou même texte à la suite)
      if (target.commentsList?.length) {
        const seen = new Set<number>();
        target.commentsList = target.commentsList.filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
        target.comments = target.commentsList.length;
      }
      target.commentSending = false;
    } catch {
      const target = this.posts.find((p) => p.id === postId);
      if (target) {
        target.commentDraft = text; // restaurer si échec
        target.commentSending = false;
      }
    }
  }

  toggleExpand(post: UiFeedPost): void {
    post.expanded = !post.expanded;
  }

  openCompose(): void {
    if (!this.auth.isLoggedIn) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.composeError = '';
    this.composeForm = {
      text: '',
      associationTag: '',
      photoDataUrl: null,
      photoFile: null,
    };
    this.showComposeModal = true;
  }

  closeCompose(): void {
    this.showComposeModal = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.composeForm.photoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.composeForm.photoDataUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.composeForm.photoDataUrl = null;
    this.composeForm.photoFile = null;
  }

  async publishPost(): Promise<void> {
    const text = this.composeForm.text.trim();
    if (!text) {
      this.composeError = 'FEED_PAGE.COMPOSE_ERROR_EMPTY';
      return;
    }
    this.composeLoading = true;
    this.composeError = '';
    try {
      let imageUrl: string | undefined;
      if (this.composeForm.photoFile) {
        const uploaded = await this.upload.uploadFile(this.composeForm.photoFile, 'posts');
        imageUrl = uploaded.url;
      }
      const created = await this.data.createPost(text, {
        imageUrl,
        associationTag: this.composeForm.associationTag.trim() || undefined,
      });
      if (!created) {
        this.composeError = 'FEED_PAGE.COMPOSE_ERROR_FAILED';
        return;
      }
      await this.data.loadPosts({ limit: 100 });
      this.showComposeModal = false;
      const toast = await this.toastCtrl.create({
        message: this.translate.instant('FEED_PAGE.COMPOSE_SUCCESS'),
        duration: 2200,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    } catch {
      this.composeError = 'FEED_PAGE.COMPOSE_ERROR_FAILED';
    } finally {
      this.composeLoading = false;
    }
  }

  private toUi(p: FeedPost, prev?: UiFeedPost): UiFeedPost {
    return {
      id: p.id,
      authorName: p.authorName,
      authorRole: '',
      authorAvatar:
        p.authorAvatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      image: p.images?.[0] || null,
      description: p.content,
      likes: p.likesCount,
      comments: p.commentsCount,
      liked: !!p.likedByMe,
      expanded: prev?.expanded ?? false,
      timeAgo: this.formatTimeAgo(p.createdAt),
      showComments: prev?.showComments ?? false,
      commentsLoading: prev?.commentsLoading ?? false,
      commentDraft: prev?.commentDraft ?? '',
      commentSending: prev?.commentSending ?? false,
      commentsList:
        Array.isArray(p.comments) && p.comments.length
          ? p.comments.map((c) => ({
              id: c.id,
              authorName: c.authorName,
              text: c.text,
            }))
          : (prev?.commentsList ?? []),
    };
  }

  private formatTimeAgo(value: string | number): string {
    const ts = typeof value === 'number' ? value : Date.parse(value);
    if (!ts || Number.isNaN(ts)) return '';
    const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (diffMin < 1) return this.translate.instant('FEED_PAGE.JUST_NOW');
    if (diffMin < 60) return this.translate.instant('FEED_PAGE.MINUTES_AGO', { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return this.translate.instant('FEED_PAGE.HOURS_AGO', { n: diffH });
    const diffD = Math.floor(diffH / 24);
    return this.translate.instant('FEED_PAGE.DAYS_AGO', { n: diffD });
  }
}
