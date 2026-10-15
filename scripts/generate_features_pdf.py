# -*- coding: utf-8 -*-
"""Génère le PDF des fonctionnalités StudHub (Front + Backend)."""
from fpdf import FPDF

OUT = r"C:\Users\Lv\Documents\E_project\studhub\StudHub_Fonctionnalites_Front_Backend.pdf"
FONT = r"C:\Windows\Fonts\arial.ttf"
FONT_B = r"C:\Windows\Fonts\arialbd.ttf"
FONT_I = r"C:\Windows\Fonts\ariali.ttf"


class Doc(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("ArialUni", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, "StudHub — Fonctionnalités Front & Backend", align="L")
        self.set_x(-30)
        self.cell(20, 6, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)
        self.set_draw_color(37, 99, 235)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("ArialUni", "I", 7)
        self.set_text_color(148, 163, 184)
        self.cell(0, 8, "Document technique — StudHub — Septembre 2026", align="C")


pdf = Doc(format="A4")
pdf.set_auto_page_break(auto=True, margin=16)
pdf.add_font("ArialUni", "", FONT)
pdf.add_font("ArialUni", "B", FONT_B)
pdf.add_font("ArialUni", "I", FONT_I)
pdf.add_page()

# Bannière
pdf.set_fill_color(30, 58, 138)
pdf.rect(0, 0, 210, 44, "F")
pdf.set_text_color(255, 255, 255)
pdf.set_font("ArialUni", "B", 20)
pdf.set_xy(14, 11)
pdf.cell(0, 10, "StudHub — Cahier des fonctionnalités")
pdf.set_font("ArialUni", "", 11)
pdf.set_xy(14, 26)
pdf.cell(0, 8, "Frontend + Backend  |  Ce qui a été ajouté et développé")
pdf.set_xy(14, 34)
pdf.set_font("ArialUni", "I", 9)
pdf.cell(0, 6, "Contexte : frontend fourni au départ — backend et features avancées développés ensuite")

pdf.set_y(52)
pdf.set_text_color(30, 41, 59)


def h1(text: str) -> None:
    pdf.ln(2)
    pdf.set_font("ArialUni", "B", 13)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(59, 130, 246)
    pdf.set_line_width(0.6)
    pdf.line(10, pdf.get_y(), 90, pdf.get_y())
    pdf.ln(3)
    pdf.set_text_color(30, 41, 59)


def h2(text: str) -> None:
    pdf.ln(1)
    pdf.set_font("ArialUni", "B", 11)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(30, 41, 59)


def p(text: str) -> None:
    pdf.set_font("ArialUni", "", 10)
    pdf.multi_cell(0, 5.2, text)
    pdf.ln(1)


def feature(name: str, desc: str, side: str = "") -> None:
    if pdf.get_y() > 260:
        pdf.add_page()
    start_y = pdf.get_y()
    title = f"{name}  [{side}]" if side else name
    pdf.set_x(12)
    pdf.set_font("ArialUni", "B", 10)
    pdf.set_text_color(15, 23, 42)
    pdf.multi_cell(186, 5.5, title)
    pdf.set_x(12)
    pdf.set_font("ArialUni", "", 9.5)
    pdf.set_text_color(71, 85, 105)
    pdf.multi_cell(186, 5, desc)
    end_y = pdf.get_y()
    pdf.set_draw_color(37, 99, 235)
    pdf.set_line_width(1.2)
    pdf.line(10, start_y, 10, end_y)
    pdf.ln(3)
    pdf.set_text_color(30, 41, 59)


def bullet(text: str) -> None:
    pdf.set_font("ArialUni", "", 10)
    pdf.set_x(14)
    pdf.multi_cell(0, 5.5, f"-  {text}")


h1("1. Contexte")
p(
    "Le projet StudHub a été fourni initialement côté frontend (application Ionic / Angular "
    "avec données mock). Le backend NestJS + PostgreSQL, ainsi que plusieurs fonctionnalités "
    "frontend avancées (cartes, proximité, favoris, OTP e-mail, etc.), ont été développés et "
    "branchés ensuite pour transformer le mock en application complète."
)
p(
    "Stack : Frontend Ionic / Angular / Capacitor  |  Backend NestJS + Prisma + PostgreSQL + Redis  |  "
    "Auth JWT  |  Upload local  |  Chat WebSocket."
)

h1("2. Fonctionnalités Frontend ajoutées / branchées")

h2("Cartographie & proximité")
feature(
    "Carte de localisation (Maps)",
    "Sur la fiche détail d'un bien ou d'un produit : carte intégrée (Google Maps embed) "
    "positionnée via géocodage OpenStreetMap / Nominatim à partir de la ville ou de l'adresse. "
    "Bouton pour ouvrir Google Maps en externe.",
    "FRONT",
)
feature(
    "Annonces à proximité (Nearby)",
    "Page /nearby accessible depuis le détail immo ou produit. Affiche les autres annonces "
    "de la même ville (hors annonce courante), avec chargement API puis fallback local.",
    "FRONT",
)

h2("Engagement & social")
feature(
    "Favoris (biens, produits, services)",
    "Page Favoris + bascule favori sur les fiches. Branchée sur l'API "
    "(PropertyFavorite, ProductFavorite, ProviderFavorite).",
    "FRONT",
)
feature(
    "Likes & compteurs de vues",
    "Like / unlike sur logements et produits ; compteur de vues uniques affiché sur les fiches détail.",
    "FRONT",
)
feature(
    "Commentaires du feed",
    "Interface pour lire et publier des commentaires sur les posts du réseau social étudiant.",
    "FRONT",
)
feature(
    "Avis / reviews",
    "Affichage et dépôt d'avis notés sur biens, produits et prestataires via l'API Reviews.",
    "FRONT",
)
feature(
    "Suivre un agent (Follow)",
    "Depuis la fiche bien / profil agent : s'abonner pour recevoir les alertes de nouvelles publications.",
    "FRONT",
)

h2("Auth, médias & UX")
feature(
    "OTP inscription par e-mail",
    "Parcours d'inscription avec envoi / vérification d'un code OTP 6 chiffres par e-mail "
    "(priorité e-mail plutôt que SMS pour le moment).",
    "FRONT",
)
feature(
    "Upload photos marketplace / annonces",
    "Sélection et upload de photos via UploadService vers le backend ; affichage via /uploads.",
    "FRONT",
)
feature(
    "Galerie photos",
    "Composant galerie pour parcourir les images d'une annonce en détail.",
    "FRONT",
)
feature(
    "Menus étudiant / agent",
    "Menus latéraux (profil, messages, favoris, publier, thème, langue, déconnexion).",
    "FRONT",
)
feature(
    "Notifications push (mobile)",
    "Service Capacitor pour enregistrer le token FCM auprès du backend.",
    "FRONT",
)
feature(
    "Profil agent",
    "Page dédiée au profil public d'un agent immobilier.",
    "FRONT",
)
feature(
    "Chat avancé",
    "Conversations, message de bienvenue système, notes vocales / overlay d'appel (composants partagés).",
    "FRONT",
)

# BACKEND
pdf.add_page()
h1("3. Backend complet (NestJS)")
p(
    "API REST versionnée /api/v1, documentation Swagger sur /docs, fichiers statiques /uploads, "
    "monitoring /v1/health. Sécurité : Helmet, CORS (web + LAN + Capacitor), rate-limit, "
    "ValidationPipe, JWT + rôles."
)

h2("Modules métier")
feature(
    "Auth",
    "Inscription / connexion étudiant & agent, OTP e-mail (send / verify), refresh token, "
    "logout, mot de passe oublié, endpoint /me.",
    "BACK",
)
feature("Users", "Lecture et mise à jour du profil étudiant.", "BACK")
feature(
    "Agents",
    "Profil public agent + follow / unfollow / follow-status pour les alertes de publication.",
    "BACK",
)
feature(
    "Properties (Immobilier)",
    "Liste filtrée, CRUD agent, détail avec vue unique, favori, like. "
    "Route agent/me pour le dashboard agent.",
    "BACK",
)
feature(
    "Products (Marketplace)",
    "CRUD produits, filtres (ville, catégorie…), like, favoris (toggle + liste favorites/mine), vues uniques.",
    "BACK",
)
feature(
    "Providers (StudServices)",
    "Prestataires de services étudiants : liste, création / mise à jour, favoris.",
    "BACK",
)
feature(
    "Posts (Feed)",
    "Publication de posts, like, liste et création de commentaires.",
    "BACK",
)
feature(
    "Reviews",
    "Lister et créer des avis notés sur PROPERTY / PRODUCT / PROVIDER.",
    "BACK",
)
feature(
    "Chat",
    "Conversations, messages, marquage lu, conversation système de bienvenue, "
    "gateway WebSocket temps réel.",
    "BACK",
)
feature(
    "Push",
    "Enregistrement / suppression des tokens appareils FCM ; envoi (ou simulation) de notifications.",
    "BACK",
)
feature(
    "Upload",
    "Upload multipart d'images stockées localement et servies sous /uploads.",
    "BACK",
)
feature("Health", "Statut API + PostgreSQL + Redis pour le monitoring.", "BACK")

h2("Services transverses")
feature(
    "OTP + Email + SMS Twilio",
    "Génération / vérification de codes OTP (Redis). Envoi e-mail (nodemailer) pour "
    "l'inscription ; SMS Twilio disponible.",
    "BACK",
)
feature(
    "Guards JWT / rôles / JWT optionnel",
    "Protection des routes selon le rôle (STUDENT, AGENT, ADMIN). "
    "JWT optionnel pour les vues anonymes ou connectées.",
    "BACK",
)

h2("Migrations BDD ajoutées après le socle")
feature("system_welcome_chat", "Conversations SYSTEM non répondables + messages isSystem.", "BDD")
feature("agent_follow", "Table AgentFollow (abonnés aux alertes agent).", "BDD")
feature(
    "property_product_likes_views",
    "Likes biens / produits + compteurs likesCount / viewsCount.",
    "BDD",
)
feature(
    "listing_unique_views",
    "Tables PropertyView / ProductView (1 vue / utilisateur ou appareil).",
    "BDD",
)
feature("product_provider_favorites", "Favoris marketplace et StudServices.", "BDD")

pdf.add_page()
h1("4. Synthèse — qui a fourni quoi")
p("Frontend de base (UI Ionic, pages, navigation, mock data) : fourni au démarrage du projet.")
p("Apports développés ensuite :")
for it in [
    "Backend NestJS complet (API, auth, modules métier, Prisma, PostgreSQL, Redis)",
    "Cartes de localisation (Maps embed + ouverture externe)",
    "Annonces à proximité (Nearby) filtrées par ville",
    "Favoris produits / providers + page Favoris branchée API",
    "Likes et vues uniques (front + back)",
    "Follow agents",
    "OTP inscription par e-mail",
    "Upload photos réel (marketplace / annonces)",
    "Commentaires feed & avis sur fiches détail",
    "Push notifications, chat système welcome, galerie photos",
]:
    bullet(it)

pdf.ln(6)
h1("5. Accès techniques")
p("Frontend : http://localhost:4200")
p("Backend API : http://localhost:3000/api/v1")
p("Swagger : http://localhost:3000/docs")
p("Health : http://localhost:3000/v1/health")
p("Uploads : http://localhost:3000/uploads/...")

pdf.ln(8)
pdf.set_fill_color(239, 246, 255)
pdf.set_font("ArialUni", "I", 9)
pdf.set_text_color(51, 65, 85)
pdf.multi_cell(
    0,
    5,
    "Document généré pour présenter l'ensemble des fonctionnalités ajoutées côté frontend "
    "et backend StudHub. Date : 29 septembre 2026.",
)

pdf.output(OUT)
print("OK", OUT)
