
// ===== ADMIN FUNCTIONALITIES (VERSION SUPABASE) =====
// Dépend de config.js pour initSupabase()

document.addEventListener('DOMContentLoaded', async function () {

    // ===== AUTHENTIFICATION SUPABASE =====
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const sidebar = document.querySelector('.admin-sidebar');
    const main = document.querySelector('.admin-main');
    const adminContent = document.querySelector('.admin-body');

    // ===== MOBILE NAVIGATION LOGIC =====
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Initialiser Supabase (sécurisé, clé publique)
    window.supabaseClient = initSupabase();

    // Vérifier si connecté
    const checkAuthStatus = async () => {
        if (!window.supabaseClient) return;

        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        if (!session) {
            // Flouter le fond ou cacher le contenu
            if (sidebar) sidebar.style.filter = 'blur(5px)';
            if (main) main.style.filter = 'blur(5px)';
            if (loginModal) {
                loginModal.style.zIndex = '99999';
                loginModal.style.display = 'flex';
            }
        } else {
            // Utilisateur connecté
            if (loginModal) loginModal.style.display = 'none';
            if (sidebar) sidebar.style.filter = 'none';
            if (main) main.style.filter = 'none';
            initAdmin();
        }
    };

    checkAuthStatus();

    // Gérer la connexion
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('adminEmailInput').value;
            const password = document.getElementById('adminPassword').value;
            const loginError = document.getElementById('loginError');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            submitBtn.disabled = true;

            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                loginError.style.display = 'block';
                loginError.textContent = 'Identifiants incorrects';
                submitBtn.innerHTML = '<i class="fas fa-lock"></i> Se connecter';
                submitBtn.disabled = false;
            } else {
                loginError.style.display = 'none';
                window.location.reload();
            }
        });
    }

    // ===== FONCTIONS PRINCIPALES (Exécutées seulement si connecté) =====
    function initAdmin() {
        console.log('Admin initialisé avec Supabase');

        // Charger les statistiques et la galerie
        loadDashboardStats();
        loadGalleryFromDB();
        loadRecentUploads(); // Nouveau : Charger widget dashboard
        initSettings();      // Nouveau : Gestion paramètres

        // Initialiser les messages (depuis admin-supabase.js si présent)
        if (window.initMessagesSystem) {
            window.initMessagesSystem();
        }
    }

    // ... (Navigation logic stays same) ...

    // ===== DASHBOARD WIDGETS =====
    async function loadRecentUploads() {
        if (!window.supabaseClient) return;

        const recentUploadsGrid = document.getElementById('recentUploads');
        if (!recentUploadsGrid) return;

        try {
            const { data: photos, error } = await window.supabaseClient
                .from('gallery')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) throw error;

            if (!photos || photos.length === 0) {
                recentUploadsGrid.innerHTML = `
                    <div class="no-photos">
                        <i class="fas fa-images fa-3x"></i>
                        <p>Aucune photo récente</p>
                    </div>`;
                return;
            }

            recentUploadsGrid.innerHTML = '';
            photos.forEach(photo => {
                const div = document.createElement('div');
                div.className = 'upload-item';
                div.innerHTML = `
                    <img src="${photo.image_url}" alt="${photo.title}">
                    <div class="upload-info">
                        <span>${photo.category}</span>
                    </div>
                `;
                recentUploadsGrid.appendChild(div);
            });

        } catch (error) {
            console.error('Erreur recent uploads:', error);
        }
    }

    // ===== SETTINGS LOGIC =====
    function initSettings() {
        const form = document.querySelector('.settings-form');
        if (!form) return;

        // Load settings
        const settings = JSON.parse(localStorage.getItem('pk_settings') || '{}');
        if (settings.siteName) document.getElementById('siteName').value = settings.siteName;
        if (settings.adminEmail) document.getElementById('adminEmail').value = settings.adminEmail;
        if (settings.siteDescription) document.getElementById('siteDescription').value = settings.siteDescription;

        // Save settings
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newSettings = {
                siteName: document.getElementById('siteName').value,
                adminEmail: document.getElementById('adminEmail').value,
                siteDescription: document.getElementById('siteDescription').value
            };
            localStorage.setItem('pk_settings', JSON.stringify(newSettings));
            showAdminNotification('Paramètres enregistrés avec succès', 'success');
        });

        // Buttons
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
            showAdminNotification('Cache vidé', 'info');
            setTimeout(() => window.location.reload(), 1000);
        });

        document.getElementById('resetSiteBtn')?.addEventListener('click', () => {
            if (confirm('Attention: Cela réinitialisera les paramètres locaux. Continuer ?')) {
                localStorage.removeItem('pk_settings');
                window.location.reload();
            }
        });

        const profileUploadInput = document.getElementById('profileUploadInput');
        if (profileUploadInput) {
            profileUploadInput.addEventListener('change', async function() {
                const file = this.files[0];
                if (!file) return;
                
                showAdminNotification('Envoi de la photo de profil...', 'info');
                
                try {
                    const fileName = `profil_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    
                    // Upload
                    const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                        .from('images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    // Get URL
                    const { data: { publicUrl } } = window.supabaseClient.storage
                        .from('images')
                        .getPublicUrl(fileName);

                    // Re-categorize old profil photos
                    await window.supabaseClient
                        .from('gallery')
                        .update({ category: 'evenement' })
                        .eq('category', 'profil');

                    // Insert new photo as 'profil'
                    const { error: dbError } = await window.supabaseClient
                        .from('gallery')
                        .insert([{
                            image_url: publicUrl,
                            category: 'profil',
                            title: 'Photo de profil'
                        }]);

                    if (dbError) throw dbError;
                    
                    showAdminNotification('Photo de profil mise à jour !', 'success');
                    loadGalleryFromDB(); // refresh backend gallery just in case
                    loadProfilePhotoAdmin(); // update avatar right away

                } catch(err) {
                    console.error('Erreur profile photo:', err);
                    showAdminNotification('Erreur lors du changement de photo.', 'error');
                } finally {
                    this.value = ''; // reset input
                }
            });
        }
    }

    // ===== NAVIGATION =====
    const navItems = document.querySelectorAll('.nav-item');
    const adminViews = document.querySelectorAll('.admin-view');
    const adminPageTitle = document.getElementById('adminPageTitle');

    window.exportContacts = async function() {
        if (!window.supabaseClient) return;
        try {
            const { data: messages, error } = await window.supabaseClient.from('messages').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (!messages || messages.length === 0) {
                alert('Aucun contact à exporter.');
                return;
            }
            
            // Build CSV
            const headers = ['Date', 'Nom', 'Email', 'Téléphone', 'Type Evénement', 'Message'];
            const csvRows = [headers.join(',')];
            
            messages.forEach(msg => {
                const row = [
                    new Date(msg.created_at).toLocaleDateString() || '',
                    `"${(msg.name || '').replace(/"/g, '""')}"`,
                    `"${(msg.email || '').replace(/"/g, '""')}"`,
                    `"${(msg.phone || '').replace(/"/g, '""')}"`,
                    `"${(msg.event_type || '').replace(/"/g, '""')}"`,
                    `"${(msg.message || '').replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'contacts_proctor_kitchen.csv');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAdminNotification('Contacts exportés avec succès !', 'success');
        } catch(err) {
            console.error('Export error:', err);
            showAdminNotification("Erreur lors de l'exportation.", 'error');
        }
    };

    window.toggleQuickActions = function() {
        const menu = document.getElementById('floatActionsMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    };

    window.changeCategory = async function() {
        const checked = document.querySelectorAll('.gallery-checkbox:checked');
        if (checked.length === 0) {
            showAdminNotification('Sélectionnez au moins une photo.', 'error');
            return;
        }

        const newCategory = prompt('Entrez la nouvelle catégorie (ex: apero, cocktails, mariage, evenement) :');
        if (!newCategory) return;
        
        if (!['apero', 'cocktails', 'mariage', 'evenement'].includes(newCategory.toLowerCase())) {
            showAdminNotification('Catégorie invalide. Mettez apero, cocktails, mariage ou evenement.', 'error');
            return;
        }

        const ids = Array.from(checked).map(cb => cb.value);

        try {
            const { error } = await window.supabaseClient
                .from('gallery')
                .update({ category: newCategory.toLowerCase() })
                .in('id', ids);

            if (error) throw error;

            showAdminNotification(`${ids.length} photo(s) modifiée(s) avec succès !`, 'success');
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            console.error('Erreur changement catégorie:', error);
            showAdminNotification('Erreur lors du changement de catégorie', 'error');
        }
    };

    window.switchView = function (viewId) {
        // Mettre à jour le titre
        const viewTitles = {
            'dashboard': 'Tableau de bord',
            'gallery-manager': 'Gestion de la galerie',
            'messages': 'Messages',
            'settings': 'Paramètres'
        };

        if (adminPageTitle && viewTitles[viewId]) {
            adminPageTitle.textContent = viewTitles[viewId];
        }

        // Mettre à jour la navigation
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${viewId}`) {
                item.classList.add('active');
            }
        });

        // Afficher la vue
        adminViews.forEach(view => {
            view.classList.remove('active');
            if (view.id === viewId) {
                view.classList.add('active');
            }
        });

        // Scroll top
        window.scrollTo(0, 0);
    };

    // Navigation events
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href === '#' || href.includes('index.html')) {
                if (this.classList.contains('logout')) return; // Géré séparément
                window.location.href = href;
                return;
            }
            const viewId = href.substring(1);
            window.switchView(viewId);
            
            // Auto-close sidebar on mobile
            if (sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });

    // ===== UPLOAD LOGIC =====
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');

    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target.tagName !== 'LABEL') fileInput.click();
        });

        // Drag & Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#D4A762';
                uploadArea.style.backgroundColor = 'rgba(212, 167, 98, 0.05)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.style.borderColor = '#ddd';
                uploadArea.style.backgroundColor = '#f9f9f9';
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', function () {
            handleFiles(this.files);
        });

        function handleFiles(files) {
            if (files.length === 0) return;
            const validFiles = [...files].filter(file => file.type.match('image.*'));
            validFiles.forEach(uploadFileToSupabase);
        }
    }

    async function uploadFileToSupabase(file) {
        if (!window.supabaseClient) return;

        // UI Update
        uploadProgress.style.display = 'block';
        uploadProgress.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: 100%"></div></div><p>Envoi de ${file.name}...</p>`;

        try {
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const category = document.getElementById('photoCategory').value || 'evenement';

            // 1. Upload Storage
            const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('images')
                .getPublicUrl(fileName);

            // 3. Insert DB
            const { error: dbError } = await window.supabaseClient
                .from('gallery')
                .insert([{
                    image_url: publicUrl,
                    category: category,
                    title: file.name
                }]);

            if (dbError) throw dbError;

            showAdminNotification(`Photo "${file.name}" ajoutée !`, 'success');
            loadGalleryFromDB(); // Rafraîchir

        } catch (error) {
            console.error('Erreur upload:', error);
            showAdminNotification(`Erreur lors de l'envoi de ${file.name}`, 'error');
        } finally {
            setTimeout(() => {
                uploadProgress.style.display = 'none';
            }, 2000);
        }
    }

    // ===== GALLERY DB LOGIC =====
    async function loadGalleryFromDB() {
        if (!window.supabaseClient) return;

        const adminGalleryGrid = document.getElementById('adminGalleryGrid');
        const dbErrorEl = document.querySelector('.no-photos-message');

        try {
            const { data: photos, error } = await window.supabaseClient
                .from('gallery')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Mettre à jour compteur
            const totalPhotos = document.getElementById('totalPhotos');
            if (totalPhotos) totalPhotos.textContent = photos.length;

            // Afficher
            if (photos.length === 0) {
                adminGalleryGrid.innerHTML = `
                    <div class="no-photos-message">
                        <i class="fas fa-images fa-4x"></i>
                        <h3>Aucune photo dans la galerie</h3>
                        <p>Ajoutez des photos via le formulaire ci-dessus.</p>
                    </div>`;
                return;
            }

            adminGalleryGrid.innerHTML = '';
            photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'admin-gallery-item';
                item.innerHTML = `
                    <img src="${photo.image_url}" alt="${photo.title || 'Photo'}">
                    <input type="checkbox" class="gallery-checkbox" value="${photo.id}">
                    <div class="gallery-info" style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.5); color:white; font-size:10px; padding:2px;">${photo.category}</div>
                    <div class="gallery-actions" style="position:absolute; right:5px; top:5px; display:flex; gap:5px;">
                        <button class="btn-small btn-delete" onclick="deletePhoto('${photo.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                adminGalleryGrid.appendChild(item);
            });

        } catch (error) {
            console.error('Erreur loading gallery:', error);
            // Si erreur, c'est peut-être que la table n'existe pas encore.
            // On ne fait rien pour ne pas casser l'UI, mais on prévient dans la console.
        }
    }

    async function loadDashboardStats() {
        if (!window.supabaseClient) return;

        try {
            // 1. Compter les photos
            const { count: photosCount, error: photosError } = await window.supabaseClient
                .from('gallery')
                .select('*', { count: 'exact', head: true });

            if (!photosError) {
                const totalPhotosEl = document.getElementById('totalPhotos');
                if (totalPhotosEl) totalPhotosEl.textContent = photosCount || 0;
            }

            // 2. Compter les messages non lus
            const { count: messagesCount, error: messagesError } = await window.supabaseClient
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false); // Filtrer par non lu

            if (!messagesError) {
                const dashboardMessageCountEl = document.getElementById('dashboardMessageCount');
                if (dashboardMessageCountEl) dashboardMessageCountEl.textContent = messagesCount || 0;
            }

            // 3. Simuler événements à venir (ou créer une table si demandé)
            const upcomingEventsEl = document.getElementById('upcomingEvents');
            if (upcomingEventsEl) upcomingEventsEl.textContent = '3'; // En attendant la gestion des événements

        } catch (error) {
            console.error('Erreur chargement stats:', error);
        }
        
        loadProfilePhotoAdmin();
    }

    async function loadProfilePhotoAdmin() {
        if (!window.supabaseClient) return;
        try {
            const { data, error } = await window.supabaseClient
                .from('gallery')
                .select('image_url')
                .eq('category', 'profil')
                .limit(1);
            if (!error && data && data.length > 0) {
                const adminUserImg = document.querySelector('.admin-user img');
                if (adminUserImg) adminUserImg.src = data[0].image_url;
            }
        } catch (err) {
            console.error('Erreur loadProfilePhotoAdmin:', err);
        }
    }

    // ===== ACTIONS LOGIC =====
    window.deletePhoto = async function (id) {
        if (!confirm('Supprimer cette photo ?')) return;

        try {
            const { error } = await window.supabaseClient
                .from('gallery')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showAdminNotification('Photo supprimée', 'success');
            loadGalleryFromDB(); // Rafraîchir

        } catch (error) {
            console.error('Erreur delete:', error);
            showAdminNotification('Erreur lors de la suppression', 'error');
        }
    };

    // Bulk Delete
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', async () => {
            const checked = document.querySelectorAll('.gallery-checkbox:checked');
            if (checked.length === 0) return;

            if (!confirm(`Supprimer ${checked.length} photos ?`)) return;

            const ids = Array.from(checked).map(cb => cb.value);

            try {
                const { error } = await window.supabaseClient
                    .from('gallery')
                    .delete()
                    .in('id', ids);

                if (error) throw error;

                showAdminNotification(`${ids.length} photos supprimées`, 'success');
                loadGalleryFromDB();

            } catch (error) {
                console.error('Erreur bulk delete:', error);
                showAdminNotification('Erreur suppression groupée', 'error');
            }
        });
    }

    // Select All
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.gallery-checkbox');
            const allChecked = Array.from(checkboxes).every(c => c.checked);
            checkboxes.forEach(c => c.checked = !allChecked);
        });
    }

    // ===== LOGOUT =====
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Se déconnecter ?')) {
                if (window.supabaseClient) {
                    await window.supabaseClient.auth.signOut();
                }
                window.location.reload();
            }
        });
    }

    // ===== NOTIFICATIONS =====
    function showAdminNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `admin-notification admin-notification-${type}`;
        notif.style.cssText = `
            position: fixed; top: 20px; right: 20px; 
            padding: 15px 20px; border-radius: 8px; z-index: 9999;
            color: white; animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;
        notif.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }

    // Styles pour animation
    const style = document.createElement('style');
    style.textContent = `@keyframes slideIn { from {transform: translateX(100%)} to {transform: translateX(0)} }`;
    document.head.appendChild(style);
});