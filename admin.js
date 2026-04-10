
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
        loadProjects(); // Nouveau : Charger les événements
        loadGalleryFromDB();
        loadRecentUploads(); // Nouveau : Charger widget dashboard
        initSettings();      // Nouveau : Gestion paramètres

        // Initialiser les messages (depuis admin-supabase.js si présent)
        if (window.initMessagesSystem) {
            window.initMessagesSystem();
        }
    }

    // ===== PROJECT MANAGEMENT =====
    window.showNewProjectForm = () => {
        document.getElementById('newProjectForm').style.display = 'block';
        window.scrollTo({ top: document.getElementById('newProjectForm').offsetTop - 100, behavior: 'smooth' });
    };

    window.hideNewProjectForm = () => {
        document.getElementById('newProjectForm').style.display = 'none';
        document.getElementById('addProjectForm').reset();
    };

    async function loadProjects() {
        if (!window.supabaseClient) return;

        const projectsList = document.getElementById('projectsList');
        const photoEventSelect = document.getElementById('photoEvent');
        
        try {
            const { data: projects, error } = await window.supabaseClient
                .from('projects')
                .select('*')
                .order('event_date', { ascending: false });

            if (error) throw error;

            // Remplir le sélecteur dans l'upload
            if (photoEventSelect) {
                photoEventSelect.innerHTML = '<option value="">Photo individuelle (sans message)</option>';
                const bulkSelect = document.getElementById('bulkEventSelect');
                if (bulkSelect) bulkSelect.innerHTML = '<option value="">Déplacer vers l\'événement...</option>';

                projects.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.dataset.category = p.category;
                    option.textContent = `${p.name} (${new Date(p.event_date).toLocaleDateString()})`;
                    
                    if (photoEventSelect) photoEventSelect.appendChild(option.cloneNode(true));
                    if (bulkSelect) bulkSelect.appendChild(option.cloneNode(true));
                });
            }

            // Remplir la liste de gestion
            if (projectsList) {
                if (projects.length === 0) {
                    projectsList.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--gray-color);">Aucun événement créé pour le moment.</div>';
                    return;
                }

                projectsList.innerHTML = '';
                projects.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'stat-card';
                    card.style.textAlign = 'left';
                    card.style.borderLeft = '5px solid var(--primary-color)';
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h4 style="margin-bottom: 5px; color: var(--secondary-color);">${p.name}</h4>
                                <p style="font-size: 0.85rem; color: var(--gray-color); margin-bottom: 10px;">
                                    <i class="far fa-calendar-alt"></i> ${new Date(p.event_date).toLocaleDateString()} | 
                                    <i class="fas fa-tag"></i> ${p.category}
                                </p>
                                <p style="font-size: 0.9rem; line-height: 1.4;">${p.description || 'Pas de description.'}</p>
                            </div>
                            <button class="btn-admin-icon btn-admin-icon-sm" onclick="deleteProject('${p.id}')" style="color: var(--accent-color);">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    projectsList.appendChild(card);
                });
            }

        } catch (err) {
            console.error('Erreur loading projects:', err);
        }
    }

    // Gérer l'ajout d'un projet
    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            
            const projectData = {
                name: document.getElementById('projectName').value,
                event_date: document.getElementById('projectDate').value,
                category: document.getElementById('projectCategory').value,
                description: document.getElementById('projectDescription').value
            };

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';

            try {
                const { error } = await window.supabaseClient
                    .from('projects')
                    .insert([projectData]);

                if (error) throw error;

                showAdminNotification('Événement créé avec succès !', 'success');
                hideNewProjectForm();
                loadProjects();
            } catch (err) {
                console.error('Erreur création projet:', err);
                showAdminNotification('Erreur lors de la création.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Enregistrer l\'événement';
            }
        });
    }

    window.deleteProject = async (id) => {
        if (!confirm('Voulez-vous vraiment supprimer cet événement ? Les photos liées resteront en galerie mais ne seront plus groupées.')) return;

        try {
            const { error } = await window.supabaseClient
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showAdminNotification('Événement supprimé.', 'success');
            loadProjects();
        } catch (err) {
            console.error('Erreur delete project:', err);
            showAdminNotification('Erreur lors de la suppression.', 'error');
        }
    };

    // ===== BULK ACTIONS LOGIC =====
    let selectedPhotoIds = [];

    window.togglePhotoSelection = () => {
        // Utiliser .value car c'est là que l'ID est stocké dans le HTML
        const checkboxes = document.querySelectorAll('.photo-item-checkbox:checked');
        selectedPhotoIds = Array.from(checkboxes)
                                .map(cb => cb.value)
                                .filter(id => id && id !== 'undefined');
        
        const bulkBar = document.getElementById('bulkActionsBar');
        const countSpan = document.getElementById('selectedCount');
        
        if (selectedPhotoIds.length > 0) {
            bulkBar.style.display = 'flex';
            countSpan.textContent = selectedPhotoIds.length;
        } else {
            bulkBar.style.display = 'none';
        }
    };

    window.clearBulkSelection = () => {
        const checkboxes = document.querySelectorAll('.photo-item-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        selectedPhotoIds = [];
        document.getElementById('bulkActionsBar').style.display = 'none';
    };

    window.applyBulkMove = async () => {
        const targetProjectId = document.getElementById('bulkEventSelect').value;
        if (!targetProjectId) {
            showAdminNotification('Veuillez choisir un événement de destination.', 'info');
            return;
        }

        if (selectedPhotoIds.length === 0) return;

        const confirmBtn = document.querySelector('#bulkActionsBar .btn-admin-primary');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';

        try {
            // Récupérer la catégorie du projet cible pour synchroniser les photos
            const { data: project } = await window.supabaseClient
                .from('projects')
                .select('category')
                .eq('id', targetProjectId)
                .single();

            const { error } = await window.supabaseClient
                .from('gallery')
                .update({ 
                    project_id: targetProjectId,
                    category: project ? project.category : 'evenement'
                })
                .in('id', selectedPhotoIds);

            if (error) throw error;

            showAdminNotification(`${selectedPhotoIds.length} photos déplacées avec succès !`, 'success');
            clearBulkSelection();
            loadGalleryFromDB();
        } catch (err) {
            console.error('Erreur bulk move:', err);
            showAdminNotification('Erreur lors du déplacement.', 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    };

    // Mises à jour individuelles
    window.updatePhotoProject = async (photoId, projectId) => {
        try {
            let categoryUpdate = {};
            if (projectId) {
                const { data: project } = await window.supabaseClient.from('projects').select('category').eq('id', projectId).single();
                if (project) categoryUpdate = { category: project.category };
            }

            const { error } = await window.supabaseClient
                .from('gallery')
                .update({ project_id: projectId || null, ...categoryUpdate })
                .eq('id', photoId);

            if (error) throw error;
            showAdminNotification('Photo mise à jour.', 'success');
            // Pas besoin de recharger toute la vue pour un changement unique si on veut garder de la fluidité
        } catch (err) {
            console.error('Erreur update photo project:', err);
            showAdminNotification('Erreur de mise à jour.', 'error');
        }
    };

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
            'projects-manager': 'Gestion des Événements',
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

        async function handleFiles(files) {
            if (files.length === 0) return;
            const validFiles = [...files].filter(file => file.type.match('image.*'));
            
            try {
                // 1. Récupérer les titres existants pour filtrer les doublons
                const { data: existing, error } = await window.supabaseClient
                    .from('gallery')
                    .select('title');
                
                if (error) throw error;
                
                const existingTitles = new Set(existing.map(item => item.title));
                const filesToUpload = validFiles.filter(file => {
                    if (existingTitles.has(file.name)) {
                        console.warn(`Le fichier ${file.name} existe déjà et sera ignoré.`);
                        showAdminNotification(`"${file.name}" est déjà présent (doublon ignoré).`, 'info');
                        return false;
                    }
                    return true;
                });

                // 2. Lancer les uploads
                for (const file of filesToUpload) {
                    await uploadFileToSupabase(file);
                }
            } catch (err) {
                console.error('Erreur filtrage doublons:', err);
                // Si erreur, on tente quand même l'upload sans filtre
                validFiles.forEach(uploadFileToSupabase);
            }
        }
    }

    async function uploadFileToSupabase(file) {
        if (!window.supabaseClient) return;

        // UI Update
        uploadProgress.style.display = 'block';
        uploadProgress.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: 100%"></div></div><p>Envoi de ${file.name}...</p>`;

        try {
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            
            // Nouveau : Récupérer le projet lié
            const projectSelect = document.getElementById('photoEvent');
            const projectId = projectSelect?.value || null;
            
            // Si un projet est sélectionné, sa catégorie prime
            let category = document.getElementById('photoCategory').value || 'evenement';
            if (projectId && projectSelect.selectedOptions[0]) {
                category = projectSelect.selectedOptions[0].dataset.category || category;
            }

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
                    title: file.name,
                    project_id: projectId // Nouveau : lien vers le projet
                }]);

            if (dbError) throw dbError;

            showAdminNotification(`Photo "${file.name}" ajoutée !`, 'success');
            loadGalleryFromDB(); // Rafraîchir
            loadProjects();      // Rafraîchir sélecteurs

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
                const isSelected = selectedPhotoIds.includes(photo.id);
                const item = document.createElement('div');
                item.className = `admin-gallery-item ${isSelected ? 'selected' : ''}`;
                item.innerHTML = `
                    <div class="photo-select-checkbox">
                        <input type="checkbox" class="photo-item-checkbox gallery-checkbox" value="${photo.id}" ${isSelected ? 'checked' : ''} onchange="togglePhotoSelection()">
                    </div>
                    <img src="${photo.image_url}" alt="${photo.title || 'Photo'}">
                    <div class="photo-details">
                        <select class="photo-event-mini-select" onchange="updatePhotoProject('${photo.id}', this.value)">
                            <option value="">Aucun événement</option>
                            ${Array.from(document.getElementById('photoEvent').options).slice(1).map(opt => 
                                `<option value="${opt.value}" ${photo.project_id === opt.value ? 'selected' : ''}>${opt.text}</option>`
                            ).join('')}
                        </select>
                        <button class="btn-icon-delete" onclick="deletePhoto('${photo.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
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