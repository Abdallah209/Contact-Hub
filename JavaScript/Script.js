
const STORAGE_KEY = 'contacthub_contacts_v1';

    let contacts = [];
    let currentFilter = 'all'; 
    let pendingDeleteId = null;
    let pendingClearAll = false;
    let currentUploadedPhoto = '';
    let successTimeout = null;

const AVATAR_GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600'
    ];

        document.addEventListener('DOMContentLoaded', () => {
            loadContactsFromStorage();
            renderApp();
            lucide.createIcons();

            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('settingsDropdown');
                if (!dropdown.classList.contains('hidden') && !e.target.closest('#settingsDropdown') && !e.target.closest('[title="Data & Settings"]')) {
                    dropdown.classList.add('hidden');
                }
            });
        });

        function loadContactsFromStorage() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                contacts = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(contacts)) contacts = [];
            } catch (err) {
                console.error('Failed to load contacts from localStorage:', err);
                contacts = [];
            }
        }
    function saveContactsToStorage() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
            } catch (err) {
                console.error('Failed to save contacts to localStorage:', err);
                showToast('Storage quota exceeded. Try using a smaller photo.');
            }
        }

        function getAvatarGradient(name) {
            if (!name) return AVATAR_GRADIENTS[0];
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
        }

        function getInitials(name) {
            if (!name) return '?';
            const parts = name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        function escapeHTML(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, function(m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[m];
            });
        }

        function getFilteredContacts() {
            const query = document.getElementById('searchInput').value.trim().toLowerCase();
            return contacts.filter(contact => {
                // Quick filter check
                if (currentFilter === 'favorites' && !contact.isFavorite) return false;
                if (currentFilter === 'emergency' && !contact.isEmergency) return false;

                if (!query) return true;
                const matchName = (contact.name || '').toLowerCase().includes(query);
                const matchPhone = (contact.phone || '').toLowerCase().includes(query);
                const matchEmail = (contact.email || '').toLowerCase().includes(query);
                const matchGroup = (contact.group || '').toLowerCase().includes(query);
                return matchName || matchPhone || matchEmail || matchGroup;
            });
        }
        function renderApp() {
            const total = contacts.length;
            const favList = contacts.filter(c => c.isFavorite);
            const emgList = contacts.filter(c => c.isEmergency);

            document.getElementById('totalCount').textContent = total;
            document.getElementById('favoritesCount').textContent = favList.length;
            document.getElementById('emergencyCount').textContent = emgList.length;

            const notifDot = document.getElementById('notifDot');
            if (emgList.length > 0) notifDot.classList.remove('hidden');
            else notifDot.classList.add('hidden');

            const headingEl = document.getElementById('sectionHeading');
            const subheadingEl = document.getElementById('sectionSubheading');
            const clearFilterBtn = document.getElementById('clearFilterBtn');

            if (currentFilter === 'favorites') {
                headingEl.textContent = 'Favorite Contacts';
                subheadingEl.textContent = `Showing ${favList.length} starred contact${favList.length === 1 ? '' : 's'}`;
                clearFilterBtn.classList.remove('hidden');
                clearFilterBtn.classList.add('inline-flex');
            } else if (currentFilter === 'emergency') {
                headingEl.textContent = 'Emergency Contacts';
                subheadingEl.textContent = `Showing ${emgList.length} urgent contact${emgList.length === 1 ? '' : 's'}`;
                clearFilterBtn.classList.remove('hidden');
                clearFilterBtn.classList.add('inline-flex');
            } else {
                headingEl.textContent = 'All Contacts';
                subheadingEl.textContent = `Manage and organize your ${total} contacts`;
                clearFilterBtn.classList.add('hidden');
                clearFilterBtn.classList.remove('inline-flex');
            }

            const searchVal = document.getElementById('searchInput').value;
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (searchVal.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');

            const filtered = getFilteredContacts();
            const gridEl = document.getElementById('contactsGrid');
            const emptyEl = document.getElementById('emptyState');

            if (filtered.length === 0) {
                gridEl.innerHTML = '';
                emptyEl.classList.remove('hidden');
                if (total > 0) {
                    document.getElementById('emptyTitle').textContent = 'No matching contacts';
                    document.getElementById('emptySubtitle').textContent = 'Try adjusting your search or filter';
                } else {
                    document.getElementById('emptyTitle').textContent = 'No contacts found';
                    document.getElementById('emptySubtitle').textContent = 'Click "Add Contact" to get started';
                }
            } else {
                emptyEl.classList.add('hidden');
                gridEl.innerHTML = filtered.map(contact => createContactCardHTML(contact)).join('');
            }

            renderFavoritesSidebar(favList);
            renderEmergencySidebar(emgList);

            lucide.createIcons();
        }

        function createContactCardHTML(contact) {
            const safeName = escapeHTML(contact.name);
            const safePhone = escapeHTML(contact.phone);
            const safeEmail = escapeHTML(contact.email);
            const safeAddress = escapeHTML(contact.address);
            const safeGroup = escapeHTML(contact.group);
            const safeNotes = escapeHTML(contact.notes);
            const initials = getInitials(contact.name);
            const gradient = getAvatarGradient(contact.name);

            const avatarContent = contact.photo
                ? `<img src="${contact.photo}" alt="${safeName}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base">${initials}</div>`;

            const starBadge = contact.isFavorite
                ? `<span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF8A00] text-white flex items-center justify-center ring-2 ring-white shadow-sm">
                     <i data-lucide="star" class="w-2.5 h-2.5 fill-white"></i>
                   </span>`
                : '';

            const heartBadge = contact.isEmergency
                ? `<span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F40B38] text-white flex items-center justify-center ring-2 ring-white shadow-sm">
                     <i data-lucide="heart-pulse" class="w-2.5 h-2.5"></i>
                   </span>`
                : '';

            return `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-lg hover:border-slate-200/90 transition-all duration-200 flex flex-col justify-between overflow-hidden">
                <!-- Card Main Info -->
                <div class="p-5 pb-4">
                    <div class="flex items-start gap-3.5">
                        <!-- Circular Avatar with Status Overlays -->
                        <div class="relative w-12 h-12 shrink-0">
                            <div class="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                                ${avatarContent}
                            </div>
                            ${starBadge}
                            ${heartBadge}
                        </div>

                        <!-- Name & Phone Pill -->
                        <div class="min-w-0 flex-1">
                            <h4 class="text-base font-bold text-slate-900 truncate" title="${safeName}">${safeName}</h4>
                            <div class="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/90 text-blue-700 text-xs font-medium max-w-full">
                                <i data-lucide="phone" class="w-3 h-3 text-blue-600 shrink-0"></i>
                                <span class="truncate">${safePhone}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Email, Address & Tags -->
                    <div class="mt-3.5 space-y-2">
                        ${safeEmail ? `
                        <div class="flex items-center gap-2 text-xs text-slate-600">
                            <span class="w-6 h-6 rounded-lg bg-purple-50 text-[#5B3DF5] flex items-center justify-center shrink-0">
                                <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                            </span>
                            <span class="truncate" title="${safeEmail}">${safeEmail}</span>
                        </div>` : ''}

                        ${safeAddress ? `
                        <div class="flex items-center gap-2 text-xs text-slate-500">
                            <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                            </span>
                            <span class="truncate" title="${safeAddress}">${safeAddress}</span>
                        </div>` : ''}

                        ${(contact.isEmergency || safeGroup) ? `
                        <div class="flex flex-wrap items-center gap-1.5 pt-1">
                            ${contact.isEmergency ? `
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-[#F40B38] text-[11px] font-semibold">
                                <i data-lucide="heart-pulse" class="w-3 h-3"></i>
                                Emergency
                            </span>` : ''}
                            ${safeGroup ? `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 text-[#5B3DF5] text-[11px] font-semibold">
                                ${safeGroup}
                            </span>` : ''}
                        </div>` : ''}

                        ${safeNotes ? `
                        <p class="text-[11px] text-slate-400 italic line-clamp-1 pt-0.5" title="${safeNotes}">"${safeNotes}"</p>
                        ` : ''}
                    </div>
                </div>

                <!-- Card Footer Quick Actions -->
                <div class="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                    <!-- Left: Call & Email Links -->
                    <div class="flex items-center gap-2">
                        <a href="tel:${safePhone}" title="Call ${safeName}"
                            class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors">
                            <i data-lucide="phone" class="w-3.5 h-3.5 fill-emerald-600/20"></i>
                        </a>
                        ${safeEmail ? `
                        <a href="mailto:${safeEmail}" title="Email ${safeName}"
                            class="w-8 h-8 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#5B3DF5] flex items-center justify-center transition-colors">
                            <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                        </a>` : ''}
                    </div>

                    <!-- Right: Favorite, Emergency, Edit, Delete -->
                    <div class="flex items-center gap-1">
                        <button onclick="toggleFavorite('${contact.id}')" title="${contact.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}"
                            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${contact.isFavorite ? 'bg-amber-50 text-[#FF8A00]' : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500'}">
                            <i data-lucide="star" class="w-4 h-4 ${contact.isFavorite ? 'fill-[#FF8A00]' : ''}"></i>
                        </button>

                        <button onclick="toggleEmergency('${contact.id}')" title="${contact.isEmergency ? 'Remove from Emergency' : 'Mark as Emergency'}"
                            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${contact.isEmergency ? 'bg-rose-50 text-[#F40B38]' : 'text-slate-400 hover:bg-slate-100 hover:text-rose-500'}">
                            <i data-lucide="heart-pulse" class="w-4 h-4"></i>
                        </button>

                        <button onclick="openContactModal('${contact.id}')" title="Edit Contact"
                            class="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors">
                            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                        </button>

                        <button onclick="confirmDeleteContact('${contact.id}')" title="Delete Contact"
                            class="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-colors">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }
        function renderFavoritesSidebar(favList) {
            const container = document.getElementById('favoritesList');
            if (favList.length === 0) {
                container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8 font-medium">No favorites yet</p>`;
                return;
            }

            container.innerHTML = `<div class="space-y-2.5">` + favList.map(contact => {
                const safeName = escapeHTML(contact.name);
                const safePhone = escapeHTML(contact.phone);
                const initials = getInitials(contact.name);
                const gradient = getAvatarGradient(contact.name);

                const miniAvatar = contact.photo
                    ? `<img src="${contact.photo}" alt="${safeName}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs">${initials}</div>`;

                return `
                <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-amber-50/50 border border-slate-100 transition-colors">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs">
                            ${miniAvatar}
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-900 truncate">${safeName}</p>
                            <p class="text-[11px] text-slate-500 truncate">${safePhone}</p>
                        </div>
                    </div>
                    <a href="tel:${safePhone}" title="Call ${safeName}"
                        class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                        <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    </a>
                </div>`;
            }).join('') + `</div>`;
        }
        function renderEmergencySidebar(emgList) {
            const container = document.getElementById('emergencyList');
            if (emgList.length === 0) {
                container.innerHTML = `<p class="text-xs text-slate-400 text-center py-8 font-medium">No emergency contacts</p>`;
                return;
            }

            container.innerHTML = `<div class="space-y-2.5">` + emgList.map(contact => {
                const safeName = escapeHTML(contact.name);
                const safePhone = escapeHTML(contact.phone);
                const initials = getInitials(contact.name);
                const gradient = getAvatarGradient(contact.name);

                const miniAvatar = contact.photo
                    ? `<img src="${contact.photo}" alt="${safeName}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs">${initials}</div>`;

                return `
                <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-rose-50/50 border border-slate-100 transition-colors">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs">
                            ${miniAvatar}
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-slate-900 truncate">${safeName}</p>
                            <p class="text-[11px] text-slate-500 truncate">${safePhone}</p>
                        </div>
                    </div>
                    <a href="tel:${safePhone}" title="Urgent Call ${safeName}"
                        class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#F40B38] flex items-center justify-center shrink-0 transition-colors">
                        <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    </a>
                </div>`;
            }).join('') + `</div>`;
        }
        function setQuickFilter(filter) {
            if (currentFilter === filter && filter !== 'all') {
                currentFilter = 'all';
            } else {
                currentFilter = filter;
            }
            renderApp();
        }

        function resetSearch() {
            document.getElementById('searchInput').value = '';
            currentFilter = 'all';
            renderApp();
        }
        function toggleFavorite(id) {
            const idx = contacts.findIndex(c => c.id === id);
            if (idx !== -1) {
                contacts[idx].isFavorite = !contacts[idx].isFavorite;
                saveContactsToStorage();
                renderApp();
            }
        }
        function toggleEmergency(id) {
            const idx = contacts.findIndex(c => c.id === id);
            if (idx !== -1) {
                contacts[idx].isEmergency = !contacts[idx].isEmergency;
                saveContactsToStorage();
                renderApp();
            }
        }
        function openContactModal(editId = null) {
            const modal = document.getElementById('contactModal');
            const form = document.getElementById('contactForm');
            form.reset();
            currentUploadedPhoto = '';
            updateAvatarPreview('');

            if (editId) {
                const contact = contacts.find(c => c.id === editId);
                if (!contact) return;

                document.getElementById('modalTitle').textContent = 'Edit Contact';
                document.getElementById('contactId').value = contact.id;
                document.getElementById('fullNameInput').value = contact.name || '';
                document.getElementById('phoneInput').value = contact.phone || '';
                document.getElementById('emailInput').value = contact.email || '';
                document.getElementById('addressInput').value = contact.address || '';
                document.getElementById('groupInput').value = contact.group || '';
                document.getElementById('notesInput').value = contact.notes || '';
                document.getElementById('favoriteCheckbox').checked = !!contact.isFavorite;
                document.getElementById('emergencyCheckbox').checked = !!contact.isEmergency;

                if (contact.photo) {
                    currentUploadedPhoto = contact.photo;
                    updateAvatarPreview(contact.photo);
                }
            } else {
                document.getElementById('modalTitle').textContent = 'Add New Contact';
                document.getElementById('contactId').value = '';
            }

            modal.classList.remove('hidden');
            lucide.createIcons();
            setTimeout(() => document.getElementById('fullNameInput').focus(), 50);
        }

        function closeContactModal() {
            document.getElementById('contactModal').classList.add('hidden');
        }

        function handlePhotoUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const maxSize = 240;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    currentUploadedPhoto = canvas.toDataURL('image/jpeg', 0.85);
                    updateAvatarPreview(currentUploadedPhoto);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function removePhoto() {
            currentUploadedPhoto = '';
            document.getElementById('photoInput').value = '';
            updateAvatarPreview('');
        }

        function updateAvatarPreview(dataUrl) {
            const imgEl = document.getElementById('avatarPreviewImg');
            const iconEl = document.getElementById('avatarDefaultIcon');
            const removeBtn = document.getElementById('removePhotoBtn');

            if (dataUrl) {
                imgEl.src = dataUrl;
                imgEl.classList.remove('hidden');
                iconEl.classList.add('hidden');
                removeBtn.classList.remove('hidden');
            } else {
                imgEl.src = '';
                imgEl.classList.add('hidden');
                iconEl.classList.remove('hidden');
                removeBtn.classList.add('hidden');
            }
        }
        function handleSaveContact(event) {
            event.preventDefault();

            const id = document.getElementById('contactId').value;
            const name = document.getElementById('fullNameInput').value.trim();
            const phone = document.getElementById('phoneInput').value.trim();
            const email = document.getElementById('emailInput').value.trim();
            const address = document.getElementById('addressInput').value.trim();
            const group = document.getElementById('groupInput').value;
            const notes = document.getElementById('notesInput').value.trim();
            const isFavorite = document.getElementById('favoriteCheckbox').checked;
            const isEmergency = document.getElementById('emergencyCheckbox').checked;

            if (!name || !phone) return;

            if (id) {
                const index = contacts.findIndex(c => c.id === id);
                if (index !== -1) {
                    contacts[index] = {
                        ...contacts[index],
                        name,
                        phone,
                        email,
                        address,
                        group,
                        notes,
                        isFavorite,
                        isEmergency,
                        photo: currentUploadedPhoto,
                        updatedAt: Date.now()
                    };
                }
                closeContactModal();
                saveContactsToStorage();
                renderApp();
                showSuccessModal('Updated!', 'Contact details have been saved.');
            } else {
                const newContact = {
                    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    name,
                    phone,
                    email,
                    address,
                    group,
                    notes,
                    isFavorite,
                    isEmergency,
                    photo: currentUploadedPhoto,
                    createdAt: Date.now()
                };
                contacts.unshift(newContact);
                closeContactModal();
                saveContactsToStorage();
                renderApp();
                showSuccessModal('Saved!', `${name} has been added to your contacts.`);
            }
        }

        function confirmDeleteContact(id) {
            const contact = contacts.find(c => c.id === id);
            if (!contact) return;

            pendingDeleteId = id;
            pendingClearAll = false;
            document.getElementById('deleteModalTitle').textContent = 'Delete Contact?';
            document.getElementById('deleteModalMessage').textContent = 
                `Are you sure you want to delete ${contact.name}? This action cannot be undone.`;
            document.getElementById('confirmDeleteBtn').textContent = 'Yes, delete it!';
            document.getElementById('deleteConfirmModal').classList.remove('hidden');
        }

        function openClearAllModal() {
            document.getElementById('settingsDropdown').classList.add('hidden');
            if (contacts.length === 0) {
                showToast('Your contact list is already empty.');
                return;
            }
            pendingDeleteId = null;
            pendingClearAll = true;
            document.getElementById('deleteModalTitle').textContent = 'Clear All Contacts?';
            document.getElementById('deleteModalMessage').textContent = 
                `Are you sure you want to delete all ${contacts.length} contacts? This action cannot be undone.`;
            document.getElementById('confirmDeleteBtn').textContent = 'Yes, clear all!';
            document.getElementById('deleteConfirmModal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            pendingDeleteId = null;
            pendingClearAll = false;
            document.getElementById('deleteConfirmModal').classList.add('hidden');
        }

        function executeDelete() {
            if (pendingClearAll) {
                contacts = [];
                saveContactsToStorage();
                closeDeleteModal();
                renderApp();
                showSuccessModal('Cleared!', 'All contacts have been deleted.');
                return;
            }

            if (pendingDeleteId) {
                contacts = contacts.filter(c => c.id !== pendingDeleteId);
                saveContactsToStorage();
                closeDeleteModal();
                renderApp();
                showSuccessModal('Deleted!', 'Contact has been deleted.');
            }
        }

        function showSuccessModal(title, subtitle) {
            if (successTimeout) clearTimeout(successTimeout);
            document.getElementById('successModalTitle').textContent = title;
            document.getElementById('successModalSubtitle').textContent = subtitle;
            document.getElementById('successModal').classList.remove('hidden');

            successTimeout = setTimeout(() => {
                closeSuccessModal();
            }, 1600);
        }

        function closeSuccessModal() {
            if (successTimeout) clearTimeout(successTimeout);
            document.getElementById('successModal').classList.add('hidden');
        }

        function exportContacts() {
            document.getElementById('settingsDropdown').classList.add('hidden');
            if (contacts.length === 0) {
                showToast('No contacts to export yet.');
                return;
            }
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(contacts, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `ContactHub_Backup_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast(`Exported ${contacts.length} contact(s) successfully.`);
        }

        function importContacts(event) {
            document.getElementById('settingsDropdown').classList.add('hidden');
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) throw new Error('Invalid format');
                    const validContacts = imported.filter(item => item && item.name && item.phone).map(item => ({
                        ...item,
                        id: item.id || ('c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7))
                    }));
                    contacts = [...validContacts, ...contacts];
                    saveContactsToStorage();
                    renderApp();
                    showSuccessModal('Imported!', `${validContacts.length} contact(s) imported.`);
                } catch (err) {
                    showToast('Invalid JSON backup file.');
                }
                event.target.value = '';
            };
            reader.readAsText(file);
        }
        function showToast(message) {
            const toast = document.getElementById('toastBanner');
            document.getElementById('toastText').textContent = message;
            toast.classList.remove('hidden');
            lucide.createIcons();
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }