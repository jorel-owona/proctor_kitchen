// ===== ANIMATIONS ET FONCTIONNALITÉS DU SITE =====

document.addEventListener('DOMContentLoaded', function () {

    // ===== MENU MOBILE =====
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle) {
        navToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // ===== SCROLL REVEAL ANIMATIONS =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    // Observer les éléments à animer
    document.querySelectorAll('.animate-left, .animate-right, .animate-up').forEach(el => {
        observer.observe(el);
    });

    // ===== COMPTEURS ANIMÉS =====
    function animateCounters() {
        const counters = document.querySelectorAll('.counter');
        const speed = 200; // plus bas = plus rapide

        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const increment = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(animateCounters, 1);
            } else {
                counter.innerText = target.toLocaleString();
            }
        });
    }

    // Observer les compteurs
    const counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(counter => {
        counterObserver.observe(counter.parentElement);
    });

    // ===== FILTRES GALERIE =====
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Retirer la classe active de tous les boutons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Ajouter la classe active au bouton cliqué
            this.classList.add('active');

            const filterValue = this.getAttribute('data-filter');

            // Filtrer les éléments de la galerie (Projets et Photos individuelles)
            const sections = document.querySelectorAll('.project-section, .loose-photos-header, .project-photos-grid');
            const individualItems = document.querySelectorAll('.gallery-item');

            sections.forEach(section => {
                const category = section.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue || section.classList.contains('project-photos-grid')) {
                    section.style.display = section.classList.contains('project-photos-grid') ? 'grid' : 'block';
                    if (section.classList.contains('project-section')) {
                         section.style.opacity = '1';
                         section.style.transform = 'translateY(0)';
                    }
                } else {
                    section.style.display = 'none';
                }
            });

            individualItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 200);
                }
            });
        });
    });

    // ===== SUPA BASE INTÉGRATION =====
    // Initialisation via config.js
    const supabase = typeof initSupabase === 'function' ? initSupabase() : null;

    // Fallback si initSupabase n'est pas dispo (cas où config.js n'est pas chargé)
    if (!supabase && window.supabase) {
        console.warn('config.js non chargé, utilisation de fallback');
    }

    // ===== FORMULAIRE DE CONTACT AVEC SUPA BASE =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Récupérer les données du formulaire
            const formData = new FormData(this);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone') || null,
                event_type: formData.get('event_type'),
                message: formData.get('message')
            };

            // Validation basique
            if (!data.name || !data.email || !data.message) {
                showNotification('Veuillez remplir tous les champs obligatoires', 'error');
                return;
            }

            // Afficher l'état d'envoi
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
            submitBtn.disabled = true;

            try {
                // Vérifier si Supabase est chargé
                if (!supabase) {
                    throw new Error("Configuration Supabase manquante (config.js)");
                }

                // Envoyer les données à Supabase (Table 'messages')
                const { data: result, error } = await supabase
                    .from('messages')
                    .insert([{
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        event_type: data.event_type,
                        message: data.message,
                        is_read: false, // Par défaut non lu
                        created_at: new Date().toISOString()
                    }])
                    .select();

                if (error) throw error;

                // Succès
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Message envoyé!';
                submitBtn.style.backgroundColor = '#2ecc71';

                // Afficher une notification
                showNotification('Votre message a été envoyé avec succès!', 'success');

                // Réinitialiser le formulaire après 2 secondes
                setTimeout(() => {
                    this.reset();
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.backgroundColor = '';
                }, 2000);

            } catch (error) {
                console.error('Erreur Supabase:', error);

                // En cas d'erreur, utiliser une solution de secours
                submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur';
                submitBtn.style.backgroundColor = '#e74c3c';

                // Proposer l'envoi par email
                setTimeout(() => {
                    const sendByEmail = confirm(
                        'Une erreur est survenue. Voulez-vous envoyer votre message par email ?'
                    );

                    if (sendByEmail) {
                        const emailBody = `
Nom: ${data.name}
Email: ${data.email}
Téléphone: ${data.phone || 'Non fourni'}
Type d'événement: ${data.event_type}

Message:
${data.message}
                    `;

                        window.location.href = `mailto:jorelowona413@gmail.com?subject=Demande Proctor Kitchen&body=${encodeURIComponent(emailBody)}`;
                    }

                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.backgroundColor = '';
                }, 1000);

                showNotification('Erreur d\'envoi. Veuillez réessayer.', 'error');
            }
        });
    }

    // ===== FONCTION POUR VÉRIFIER LES NOUVEAUX MESSAGES =====
    // (Utilisé dans l'admin, mais défini ici pour être accessible)
    async function checkNewMessages() {
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('*')
                .eq('notified', false)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return messages || [];
        } catch (error) {
            console.error('Erreur lors de la vérification des messages:', error);
            return [];
        }
    }

    // Rendre la fonction accessible globalement
    window.checkNewMessages = checkNewMessages;

    // ===== SMOOTH SCROLL =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Fermer le menu mobile si ouvert
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');

                // Scroll vers l'élément
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== NAVIGATION STICKY =====
    window.addEventListener('scroll', function () {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
        }

        // Animation au scroll
        const scrollPosition = window.scrollY;
        document.querySelectorAll('.section').forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (scrollPosition > sectionTop - window.innerHeight + 100) {
                section.classList.add('in-view');
            }
        });
    });

    // ===== EFFET PARALLAX =====
    window.addEventListener('scroll', function () {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.floating-image');

        parallaxElements.forEach(element => {
            const rate = scrolled * -0.5;
            element.style.transform = `translateY(${rate}px) perspective(1000px) rotateY(-15deg)`;
        });
    });

    // ===== NOTIFICATION SYSTEM =====
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(notification);

        // Style de la notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;

        // Animation d'entrée
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Bouton de fermeture
        notification.querySelector('.notification-close').addEventListener('click', function () {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        });

        // Fermeture automatique après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // ===== LOADING DYNAMIQUE DE LA GALERIE =====
    // ===== LOADING DYNAMIQUE DE LA GALERIE (VERSION SUPABASE) =====
    async function loadGalleryImages() {
        const galleryGrid = document.getElementById('galleryGrid');
        const galleryLoading = document.getElementById('galleryLoading');
        const emptyState = document.getElementById('gallery-empty-state');

        if (!galleryGrid) return;

        // Wait for Supabase
        if (!supabase && typeof initSupabase === 'function') {
            try { supabase = initSupabase(); } catch (e) { }
        }

        if (!supabase) {
            console.error("Supabase non initialisé");
            if (galleryLoading) galleryLoading.style.display = 'none';
            return;
        }

        try {
            // 1. Load projects and existing images
            const [{ data: projects, error: projError }, { data: images, error: imagesError }] = await Promise.all([
                supabase.from('projects').select('*').order('event_date', { ascending: false }),
                supabase.from('gallery').select('*').order('created_at', { ascending: false })
            ]);

            if (projError) throw projError;
            if (imagesError) throw imagesError;

            // Extract profile photo
            const profilePhoto = images.find(img => img.category === 'profil');
            const galleryImages = images.filter(img => img.category !== 'profil');

            if (profilePhoto) {
                const chefImg = document.getElementById('chefProfileImg');
                if (chefImg) chefImg.src = profilePhoto.image_url;
            }

            // Hide loading
            if (galleryLoading) galleryLoading.style.display = 'none';

            // Clear grid except empty state
            const oldItems = galleryGrid.querySelectorAll('.gallery-item, .project-section');
            oldItems.forEach(el => el.remove());

            if (!images || images.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
            } else {
                if (emptyState) emptyState.style.display = 'none';
                
                // Grouping Logic
                const photosByProject = {};
                const loosePhotos = [];

                images.forEach(img => {
                    if (img.category === 'profil') return;
                    if (img.project_id) {
                        if (!photosByProject[img.project_id]) photosByProject[img.project_id] = [];
                        photosByProject[img.project_id].push(img);
                    } else {
                        loosePhotos.push(img);
                    }
                });

                // 1. Display Projects (Albums)
                projects.forEach(project => {
                    const projectPhotos = photosByProject[project.id];
                    if (projectPhotos && projectPhotos.length > 0) {
                        addProjectToGallery(project, projectPhotos, galleryGrid);
                    }
                });

                // 2. Display Individual Photos (Those not in a project)
                if (loosePhotos.length > 0) {
                    const looseHeader = document.createElement('div');
                    looseHeader.className = 'project-section-header loose-photos-header';
                    looseHeader.setAttribute('data-category', 'all');
                    looseHeader.innerHTML = `<h3 style="margin: 40px 0 20px; font-size: 1.5rem; color: var(--secondary-color); border-bottom: 2px solid var(--primary-color); display: inline-block; padding-bottom: 5px;">Autres Réalisations</h3>`;
                    galleryGrid.appendChild(looseHeader);
                    
                    const looseGrid = document.createElement('div');
                    looseGrid.className = 'project-photos-grid';
                    galleryGrid.appendChild(looseGrid);

                    loosePhotos.forEach(image => addImageToGallery(image, looseGrid));
                }
            }

            // 2. Realtime
            supabase
                .channel('public-gallery')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'gallery' },
                    payload => {
                        console.log('📸 Nouvelle photo:', payload.new);
                        if (emptyState) emptyState.style.display = 'none';
                        addImageToGallery(payload.new, galleryGrid, true);
                    }
                )
                .on('postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'gallery' },
                    payload => {
                        console.log('🗑️ Photo supprimée:', payload.old);
                        const item = galleryGrid.querySelector(`.gallery-item[data-id="${payload.old.id}"]`);
                        if (item) {
                            item.style.opacity = '0';
                            setTimeout(() => item.remove(), 300);
                        } else {
                            loadGalleryImages(); // Fallback
                        }
                    }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'gallery' },
                    payload => {
                        // Reload if changed category
                        loadGalleryImages();
                    }
                )
                .subscribe();

        } catch (error) {
            console.error("Erreur chargement galerie:", error);
            if (galleryLoading) galleryLoading.style.display = 'none';
        }
    }

    function addProjectToGallery(project, photos, container) {
        const section = document.createElement('div');
        section.className = 'project-section animate-up';
        section.setAttribute('data-category', project.category);
        section.style.marginBottom = '60px';
        section.style.width = '100%';

        const formattedDate = new Date(project.event_date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long'
        });

        section.innerHTML = `
            <div class="project-header" style="margin-bottom: 40px; text-align: left; position: relative; padding-bottom: 20px;">
                <div class="project-meta" style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <span class="project-category-tag" style="background: var(--primary-color); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${project.category}</span>
                    <span class="project-date" style="color: #666; font-size: 0.9rem; letter-spacing: 1px;">
                        <i class="far fa-calendar-alt"></i> ${formattedDate}
                    </span>
                </div>
                <h3 class="project-title" style="font-size: 2.2rem; color: var(--secondary-color); font-family: 'Outfit', sans-serif; font-weight: 700; margin-bottom: 15px;">${project.name}</h3>
                ${project.description ? `<p class="project-description" style="color: #555; max-width: 800px; line-height: 1.8; font-size: 1.1rem; font-style: italic; border-left: 3px solid #eee; padding-left: 20px;">"${project.description}"</p>` : ''}
                <div class="project-divider" style="position: absolute; bottom: 0; left: 0; width: 60px; height: 3px; background: var(--primary-color);"></div>
            </div>
            <div class="project-photos-grid">
                <!-- Photos follow -->
            </div>
        `;

        const photoGrid = section.querySelector('.project-photos-grid');
        photos.forEach(photo => addImageToGallery(photo, photoGrid));
        
        container.appendChild(section);
    }

    function addImageToGallery(image, container, prepend = false) {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.setAttribute('data-category', image.category || 'evenement');
        galleryItem.setAttribute('data-id', image.id);

        galleryItem.style.opacity = '0';
        galleryItem.style.transform = 'translateY(20px)';
        galleryItem.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        galleryItem.innerHTML = `
            <img src="${image.image_url}" alt="${image.title || 'Photo'}" loading="lazy">
            <div class="gallery-overlay">
                <h4>${image.title || ''}</h4>
            </div>
        `;

        galleryItem.style.cursor = 'pointer';
        galleryItem.addEventListener('click', () => {
            const lightbox = document.getElementById('publicLightbox');
            const lightboxImg = document.getElementById('lightboxImg');
            const lightboxCaption = document.getElementById('lightboxCaption');
            if (lightbox && lightboxImg) {
                lightboxImg.src = image.image_url;
                lightboxCaption.textContent = image.title || 'Photo';
                lightbox.style.display = 'flex';
            }
        });

        if (prepend) {
            const firstItem = container.querySelector('.gallery-item');
            if (firstItem) {
                container.insertBefore(galleryItem, firstItem);
            } else {
                container.appendChild(galleryItem);
            }
        } else {
            container.appendChild(galleryItem);
        }

        setTimeout(() => {
            galleryItem.style.opacity = '1';
            galleryItem.style.transform = 'translateY(0)';
        }, 100);
    }

    // Lightbox close logic
    const lightbox = document.getElementById('publicLightbox');
    if (lightbox) {
        const lightboxClose = lightbox.querySelector('.lightbox-close');
        if (lightboxClose) {
            lightboxClose.addEventListener('click', () => lightbox.style.display = 'none');
        }
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.style.display = 'none';
        });
    }

    // Charger les images de la galerie
    loadGalleryImages();

    // ===== ANIMATION AU CHARGEMENT =====
    window.addEventListener('load', function () {
        document.body.classList.add('loaded');

        // Animation des éléments du hero
        const heroElements = document.querySelectorAll('.animate-text');
        heroElements.forEach((el, index) => {
            setTimeout(() => {
                el.style.animation = `fadeInUp 0.8s ease forwards ${index * 0.2}s`;
            }, 100);
        });
    });

    // ===== EFFET TYPING POUR LE TITRE =====
    const heroTitle = document.querySelector('.hero-text h1');
    if (heroTitle) {
        const text = heroTitle.innerHTML;
        heroTitle.innerHTML = '';
        let i = 0;

        function typeWriter() {
            if (i < text.length) {
                heroTitle.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        }

        // Démarrer l'effet typing quand la section est visible
        const heroObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                typeWriter();
                heroObserver.unobserve(entries[0].target);
            }
        }, { threshold: 0.5 });

        heroObserver.observe(heroTitle);
    }
});