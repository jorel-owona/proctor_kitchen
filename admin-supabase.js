// admin-supabase.js - VERSION CORRIGÉE

// Variables globales
let msgSupabase = null;
let currentMessages = [];
let realtimeSubscription = null;
let messagesInitialized = false;

// ===== FONCTIONS PRINCIPALES =====

/**
 * Initialise Supabase et le système de messages
 */
window.initMessagesSystem = async function () {
    console.log('🚀 Initialisation du système de messages...');

    try {
        // Vérifier si Supabase est disponible (la librairie)
        if (typeof window.supabase === 'undefined' && typeof window.supabaseClient === 'undefined') {
            console.error('❌ Supabase SDK non chargé');
            throw new Error('Supabase SDK non chargé.');
        }

        // Initialiser Supabase
        // On récupère le client initialisé par admin.js
        if (window.supabaseClient) {
            msgSupabase = window.supabaseClient;
            console.log('✅ Client Supabase récupéré via window.supabaseClient');
        } else if (typeof initSupabase === 'function') {
            msgSupabase = initSupabase(true);
            console.log('✅ Client Supabase initialisé via config.js');
        } else {
            throw new Error("Impossible d'initialiser Supabase : config.js manquant ou mal chargé.");
        }
        console.log('✅ Client Supabase créé');

        // 1. Vérifier la connexion
        await testSupabaseConnection();

        // 2. Charger les messages
        await loadAndDisplayMessages();

        // 3. Configurer les boutons
        setupMessageButtons();

        // 4. Démarrer le temps réel
        startRealtimeUpdates();

        // 5. Configurer le rafraîchissement automatique
        setupAutoRefresh();

        messagesInitialized = true;
        console.log('✅ Système de messages initialisé avec succès');

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion aux messages: ' + error.message, 'error');
    }
};

/**
 * Teste la connexion à Supabase
 */
async function testSupabaseConnection() {
    try {
        console.log('🔍 Test de connexion à Supabase...');

        // Test simple de connexion
        const { data, error } = await msgSupabase
            .from('messages')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ Erreur connexion Supabase:', error);
            throw new Error(`Connexion échouée: ${error.message}`);
        }

        console.log('✅ Connexion Supabase réussie');
        return true;

    } catch (error) {
        console.error('❌ Test connexion échoué:', error);
        throw error;
    }
}

/**
 * Charge et affiche les messages
 */
async function loadAndDisplayMessages() {
    console.log('📥 Chargement des messages...');

    const messagesList = document.getElementById('messagesList');
    if (!messagesList) {
        console.error('❌ Élément #messagesList non trouvé');
        return;
    }

    // Afficher le loading
    messagesList.innerHTML = `
        <div class="loading-messages">
            <i class="fas fa-spinner fa-spin"></i>
            Chargement des messages...
        </div>
    `;

    try {
        const { data: messages, error } = await msgSupabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Erreur chargement messages:', error);
            throw error;
        }

        currentMessages = messages || [];
        console.log(`✅ ${currentMessages.length} messages chargés`);

        // Afficher les messages
        renderMessages(currentMessages);

        // Mettre à jour les compteurs
        updateCounters();

        return currentMessages;

    } catch (error) {
        console.error('❌ Erreur chargement:', error);
        showMessageError();
        return [];
    }
}

/**
 * Affiche les messages dans la liste
 */
function renderMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    // Vider la liste
    messagesList.innerHTML = '';

    if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>Aucun message pour le moment</h3>
                <p>Les messages des visiteurs apparaîtront ici.</p>
            </div>
        `;
        return;
    }

    // Afficher chaque message
    messages.forEach((message) => {
        const messageElement = createMessageElement(message);
        messagesList.appendChild(messageElement);
    });
}

/**
 * Crée un élément message
 */
function createMessageElement(message) {
    const element = document.createElement('div');
    element.className = `message-item ${message.is_read ? 'read' : 'unread'}`;
    element.dataset.id = message.id;

    // Formater la date
    const date = new Date(message.created_at);
    const formattedDate = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Type d'événement
    const eventTypes = {
        'apero': 'Apéritif/Cocktail',
        'mariage': 'Mariage',
        'entreprise': 'Événement d\'entreprise',
        'prive': 'Événement privé'
    };

    const eventType = eventTypes[message.event_type] || message.event_type || 'Non spécifié';

    element.innerHTML = `
        <div class="message-header">
            <div class="message-info">
                <h4>${escapeHtml(message.name)}</h4>
                <div class="message-meta">
                    <span class="message-date">${formattedDate}</span>
                    <span class="message-type">${eventType}</span>
                    ${!message.is_read ? '<span class="new-badge">Nouveau</span>' : ''}
                </div>
            </div>
            <div class="message-actions">
                <button class="btn-icon mark-read-btn" title="Marquer comme lu">
                    <i class="fas fa-envelope${message.is_read ? '-open' : ''}"></i>
                </button>
                <button class="btn-icon reply-btn" title="Répondre">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="btn-icon delete-btn" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="message-content">
            <p>${escapeHtml(message.message)}</p>
        </div>
        <div class="message-footer">
            <span><i class="fas fa-envelope"></i> ${escapeHtml(message.email)}</span>
            ${message.phone ? `<span><i class="fas fa-phone"></i> ${escapeHtml(message.phone)}</span>` : ''}
        </div>
    `;

    // Ajouter les événements
    addMessageEvents(element, message);

    return element;
}

/**
 * Ajoute les événements à un message
 */
function addMessageEvents(element, message) {
    // Marquer comme lu
    const markReadBtn = element.querySelector('.mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            await toggleMessageRead(message.id, element);
        });
    }

    // Répondre
    const replyBtn = element.querySelector('.reply-btn');
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            replyToMessage(message.email, message.name);
        });
    }

    // Supprimer
    const deleteBtn = element.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            await deleteMessage(message.id, element);
        });
    }
}

/**
 * Marque un message comme lu/non lu
 */
async function toggleMessageRead(messageId, element) {
    try {
        const message = currentMessages.find(m => m.id === messageId);
        if (!message) return;

        const newReadStatus = !message.is_read;

        const { error } = await supabase
            .from('messages')
            .update({ is_read: newReadStatus })
            .eq('id', messageId);

        if (error) throw error;

        // Mettre à jour localement
        message.is_read = newReadStatus;

        // Mettre à jour l'affichage
        if (newReadStatus) {
            element.classList.remove('unread');
            element.classList.add('read');
            element.querySelector('.new-badge')?.remove();
            element.querySelector('.mark-read-btn i').className = 'fas fa-envelope-open';
            showNotification('Message marqué comme lu', 'success');
        } else {
            element.classList.remove('read');
            element.classList.add('unread');
            const badge = document.createElement('span');
            badge.className = 'new-badge';
            badge.textContent = 'Nouveau';
            element.querySelector('.message-meta').appendChild(badge);
            element.querySelector('.mark-read-btn i').className = 'fas fa-envelope';
            showNotification('Message marqué comme non lu', 'success');
        }

        updateCounters();

    } catch (error) {
        console.error('❌ Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

/**
 * Répondre à un message
 */
function replyToMessage(email, name) {
    const subject = encodeURIComponent(`Re: Votre demande Proctor Kitchen`);
    const body = encodeURIComponent(`Bonjour ${name},\n\nMerci pour votre message. Nous vous répondrons dans les plus brefs délais.\n\nCordialement,\nL'équipe Proctor Kitchen`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

/**
 * Supprime un message
 */
async function deleteMessage(messageId, element) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
        return;
    }

    try {
        const { error } = await msgSupabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;

        // Animation
        element.style.opacity = '0';
        element.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            // Mettre à jour la liste
            currentMessages = currentMessages.filter(m => m.id !== messageId);

            // Re-rendre
            renderMessages(currentMessages);
            updateCounters();

            showNotification('Message supprimé', 'success');
        }, 300);

    } catch (error) {
        console.error('❌ Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

/**
 * Configure les boutons de la section messages
 */
function setupMessageButtons() {
    console.log('🔧 Configuration des boutons...');

    // Actualiser
    const refreshBtn = document.getElementById('refreshMessagesBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;

            await loadAndDisplayMessages();

            setTimeout(() => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualiser';
                refreshBtn.disabled = false;
                showNotification('Messages actualisés', 'success');
            }, 500);
        });
    }

    // Tout marquer comme lu
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            const unreadMessages = currentMessages.filter(m => !m.is_read);
            if (unreadMessages.length === 0) {
                showNotification('Tous les messages sont déjà lus', 'info');
                return;
            }

            if (!confirm(`Marquer ${unreadMessages.length} message(s) comme lu ?`)) {
                return;
            }

            markAllReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            markAllReadBtn.disabled = true;

            try {
                const { error } = await msgSupabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadMessages.map(m => m.id));

                if (error) throw error;

                // Mettre à jour localement
                currentMessages.forEach(m => m.is_read = true);

                // Re-rendre
                renderMessages(currentMessages);
                updateCounters();

                showNotification(`${unreadMessages.length} message(s) marqué(s) comme lu`, 'success');

            } catch (error) {
                console.error('❌ Erreur:', error);
                showNotification('Erreur lors de l\'opération', 'error');
            } finally {
                setTimeout(() => {
                    markAllReadBtn.innerHTML = '<i class="fas fa-check-double"></i> Tout marquer comme lu';
                    markAllReadBtn.disabled = false;
                }, 500);
            }
        });
    }

    // Supprimer les lus
    const deleteReadBtn = document.getElementById('deleteAllReadBtn');
    if (deleteReadBtn) {
        deleteReadBtn.addEventListener('click', async () => {
            const readMessages = currentMessages.filter(m => m.is_read);
            if (readMessages.length === 0) {
                showNotification('Aucun message lu à supprimer', 'info');
                return;
            }

            if (!confirm(`Supprimer ${readMessages.length} message(s) lu(s) ? Cette action est irréversible.`)) {
                return;
            }

            deleteReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteReadBtn.disabled = true;

            try {
                const { error } = await supabase
                    .from('messages')
                    .delete()
                    .in('id', readMessages.map(m => m.id));

                if (error) throw error;

                // Garder seulement les non lus
                currentMessages = currentMessages.filter(m => !m.is_read);

                // Re-rendre
                renderMessages(currentMessages);
                updateCounters();

                showNotification(`${readMessages.length} message(s) supprimé(s)`, 'success');

            } catch (error) {
                console.error('❌ Erreur:', error);
                showNotification('Erreur lors de la suppression', 'error');
            } finally {
                setTimeout(() => {
                    deleteReadBtn.innerHTML = '<i class="fas fa-trash"></i> Supprimer les lus';
                    deleteReadBtn.disabled = false;
                }, 500);
            }
        });
    }

    // Filtres
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;
            applyFilter(filter);
        });
    });
}

/**
 * Applique un filtre
 */
function applyFilter(filter) {
    let filtered = [...currentMessages];

    const now = new Date();

    switch (filter) {
        case 'unread':
            filtered = filtered.filter(m => !m.is_read);
            break;
        case 'today':
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            filtered = filtered.filter(m => {
                const msgDate = new Date(m.created_at);
                return msgDate >= today;
            });
            break;
        case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(m => {
                const msgDate = new Date(m.created_at);
                return msgDate >= weekAgo;
            });
            break;
        // 'all' ne filtre rien
    }

    renderMessages(filtered);
}

/**
 * Met à jour tous les compteurs
 */
function updateCounters() {
    const total = currentMessages.length;
    const unread = currentMessages.filter(m => !m.is_read).length;

    // Badge dans la navigation
    const badge = document.getElementById('messageCount');
    if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
    }

    // Compteurs dans la section messages
    const totalEl = document.getElementById('totalMessages');
    const unreadEl = document.getElementById('unreadMessages');

    if (totalEl) totalEl.textContent = total;
    if (unreadEl) unreadEl.textContent = unread;

    // Compteur dans le dashboard (s'il existe)
    const dashboardTotal = document.querySelector('#dashboard #dashboardMessageCount');
    if (dashboardTotal) dashboardTotal.textContent = unread;
}

/**
 * Démarre les mises à jour en temps réel
 */
function startRealtimeUpdates() {
    try {
        if (realtimeSubscription) {
            msgSupabase.removeChannel(realtimeSubscription);
        }

        realtimeSubscription = msgSupabase
            .channel('messages-realtime')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    console.log('📨 Nouveau message en temps réel:', payload.new);

                    // Ajouter au début
                    currentMessages.unshift(payload.new);

                    // Re-rendre
                    renderMessages(currentMessages);
                    updateCounters();

                    // Notification
                    showNotification(
                        `Nouveau message de ${payload.new.name}`,
                        'info'
                    );
                }
            )
            // ... (rest is same, but simpler to replace just the start)
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    currentMessages = currentMessages.filter(m => m.id !== payload.old.id);
                    renderMessages(currentMessages);
                    updateCounters();
                }
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    const index = currentMessages.findIndex(m => m.id === payload.new.id);
                    if (index !== -1) {
                        currentMessages[index] = payload.new;
                        renderMessages(currentMessages);
                        updateCounters();
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔔 Status abonnement temps réel:', status);
            });

        console.log('🔔 Abonnement temps réel activé');

    } catch (error) {
        console.error('❌ Erreur temps réel:', error);
    }
}

/**
 * Configuration du rafraîchissement automatique
 */
function setupAutoRefresh() {
    // Rafraîchir toutes les 30 secondes
    setInterval(async () => {
        const messagesView = document.getElementById('messages');
        if (messagesView && messagesView.classList.contains('active')) {
            console.log('🔄 Rafraîchissement automatique des messages');
            await loadAndDisplayMessages();
        }
    }, 30000); // 30 secondes
}

/**
 * Affiche une notification
 */
function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = 'notification';

    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    const colors = {
        'success': '#2ecc71',
        'error': '#e74c3c',
        'warning': '#f39c12',
        'info': '#3498db'
    };

    notification.style.cssText = `
        background: ${colors[type] || '#3498db'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        min-width: 250px;
        max-width: 350px;
    `;

    container.appendChild(notification);

    // Bouton fermer
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });

    // Auto-fermeture
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/**
 * Affiche une erreur
 */
function showMessageError() {
    const messagesList = document.getElementById('messagesList');
    if (messagesList) {
        messagesList.innerHTML = `
            <div class="error-messages">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Erreur de connexion</h3>
                <p>Impossible de charger les messages. Vérifiez votre connexion internet.</p>
                <button class="btn-admin-primary" id="retryBtn">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;

        document.getElementById('retryBtn').addEventListener('click', () => {
            loadAndDisplayMessages();
        });
    }
}

/**
 * Échappe le HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Ajoute les styles CSS pour les notifications
 */
function addNotificationStyles() {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification {
                animation: slideIn 0.3s ease;
            }
            .new-badge {
                background: #e74c3c;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: bold;
            }
            .message-item {
                border-left: 4px solid #ddd;
                padding: 15px;
                margin-bottom: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }
            .message-item.unread {
                border-left-color: #3498db;
                background: #f8fafc;
            }
            .message-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
            }
            .message-info h4 {
                margin: 0 0 5px 0;
                color: #333;
            }
            .message-meta {
                display: flex;
                gap: 15px;
                font-size: 0.9em;
                color: #666;
            }
            .message-type {
                background: #f0f0f0;
                padding: 2px 8px;
                border-radius: 4px;
            }
            .message-actions {
                display: flex;
                gap: 5px;
            }
            .btn-icon {
                background: none;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 5px 10px;
                cursor: pointer;
                color: #666;
                transition: all 0.2s ease;
            }
            .btn-icon:hover {
                background: #f0f0f0;
            }
            .message-content p {
                margin: 10px 0;
                line-height: 1.5;
                color: #555;
            }
            .message-footer {
                display: flex;
                gap: 20px;
                font-size: 0.9em;
                color: #777;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #eee;
            }
            .message-footer i {
                margin-right: 5px;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== INITIALISATION =====

document.addEventListener('DOMContentLoaded', function () {
    console.log('📋 Admin Supabase chargé');

    // Ajouter les styles
    addNotificationStyles();

    // Vérifier si on est dans la vue messages au chargement
    const messagesView = document.getElementById('messages');
    if (messagesView && messagesView.classList.contains('active')) {
        console.log('📩 Initialisation immédiate des messages');
        setTimeout(() => {
            window.initMessagesSystem();
        }, 500);
    }
});

// ===== EXPORT POUR DEBUG =====
window.adminMessages = {
    initMessagesSystem: window.initMessagesSystem,
    loadAndDisplayMessages,
    getMessages: () => currentMessages,
    getSupabase: () => supabase,
    testConnection: testSupabaseConnection
};