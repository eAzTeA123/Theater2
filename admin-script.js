// Admin Panel Klasse
class AdminPanel {
    constructor() {
        this.settings = {};
        this.reservations = [];
        this.loginHistory = [];
        this.currentTab = 'dashboard';
        this.calendarDate = new Date();
        this.selectedDates = new Set();
        this.blockedDates = new Set();
        this.pendingChanges = false;
        this.init();
    }
    
    init() {
        console.log('Initialisiere Admin Panel...');
        
        // Login prüfen
        if (!this.checkAdminLogin()) {
            window.location.href = 'admin.html';
            return;
        }
        
        // Loading anzeigen
        document.getElementById('loading').style.display = 'flex';
        
        try {
            // Alle Daten laden
            this.loadAllData();
            
            // Event Listener einrichten
            this.setupEventListeners();
            
            // UI aktualisieren
            this.updateUI();
            
            // Kalender initialisieren
            this.initCalendar();
            
            // Loading ausblenden, Admin-Panel anzeigen
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('adminContainer').style.display = 'block';
                console.log('Admin Panel erfolgreich initialisiert');
            }, 500);
            
        } catch (error) {
            console.error('Fehler beim Initialisieren:', error);
            document.getElementById('loading').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Fehler beim Laden. Bitte Seite neu laden.</p>
                <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
            `;
        }
    }
    
    loadAllData() {
        // Settings laden
        this.loadSettings();
        
        // Reservierungen laden
        this.loadReservations();
        
        // Login-Historie laden
        this.loadLoginHistory();
        
        // Systeminfo aktualisieren
        this.updateSystemInfo();
    }
    
    checkAdminLogin() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        const loginTime = localStorage.getItem('adminLoginTime');
        
        if (!isLoggedIn || !loginTime) {
            return false;
        }
        
        // Auto logout nach 2 Stunden
        const loginDate = new Date(loginTime);
        const now = new Date();
        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursDiff > 2) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminLoginTime');
            return false;
        }
        
        return true;
    }
    
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('adminSettings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
            } else {
                // Standard Einstellungen
                this.settings = {
                    general: {
                        eventName: 'Veranstaltung',
                        eventLocation: 'Stadthalle',
                        eventTime: '19:00',
                        doorsOpen: '18:00',
                        systemActive: true,
                        maxDailyReservations: 50,
                        maxReservationsPerUser: 3,
                        language: 'de',
                        timezone: 'Europe/Berlin',
                        dateFormat: 'de-DE'
                    },
                    dates: {
                        availableDates: [],
                        blockedDates: [],
                        weekdays: [1, 2, 3, 4, 5],
                        bookingStart: this.formatDate(new Date()),
                        bookingEnd: this.formatDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
                        maxAdvanceDays: 60
                    },
                    seats: {
                        mode: 'stage',
                        rows: 8,
                        seatsPerRow: 10,
                        stageName: 'BÜHNE',
                        aislePosition: 'middle',
                        groupCount: 10,
                        slotsPerGroup: 6,
                        groupName: 'Tisch',
                        groupLayout: 'grid',
                        maxSeatsPerBooking: 8,
                        minSeatsPerBooking: 1,
                        seatSelectionMode: 'multiple'
                    },
                    prices: {
                        freeEvent: true,
                        currency: 'EUR',
                        taxRate: 19,
                        seatPrice: 10,
                        vipPrice: 15,
                        vipRows: 2,
                        groupPrice: 50,
                        slotPrice: 8,
                        discountGroups: 5,
                        paymentCash: true,
                        paymentCard: true,
                        paymentOnline: false,
                        invoiceRequired: false,
                        earlyBirdDiscount: 10,
                        groupDiscount: 15
                    },
                    design: {
                        primaryColor: '#4CAF50',
                        secondaryColor: '#3498db',
                        backgroundColor: '#f8f9fa',
                        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        fontSize: 16,
                        welcomeText: 'Willkommen zu unserer Veranstaltung! Buchen Sie jetzt Ihre Sitze.',
                        confirmationText: 'Vielen Dank für Ihre Reservierung!',
                        agbText: '',
                        privacyText: '',
                        logoUrl: '',
                        faviconUrl: '',
                        backgroundImage: ''
                    },
                    system: {
                        emailSender: 'Reservierungssystem',
                        emailFrom: '',
                        smtpHost: '',
                        smtpPort: 587,
                        analyticsEnabled: false,
                        gaId: '',
                        autoBackup: 7,
                        version: '1.0.0',
                        lastUpdate: new Date().toISOString()
                    }
                };
                this.saveSettings();
            }
            
            // Verfügbare und blockierte Daten in Sets speichern
            if (this.settings.dates.availableDates) {
                this.selectedDates = new Set(this.settings.dates.availableDates);
            }
            if (this.settings.dates.blockedDates) {
                this.blockedDates = new Set(this.settings.dates.blockedDates);
            }
            
            this.applySettingsToUI();
            
        } catch (error) {
            console.error('Fehler beim Laden der Einstellungen:', error);
            // Standardwerte setzen
            this.settings = {
                general: { systemActive: true },
                dates: { availableDates: [], blockedDates: [], weekdays: [1,2,3,4,5] },
                seats: { mode: 'stage', rows: 8, seatsPerRow: 10 },
                prices: { freeEvent: true },
                design: {},
                system: {}
            };
        }
    }
    
    loadReservations() {
        try {
            const savedReservations = localStorage.getItem('reservations');
            this.reservations = savedReservations ? JSON.parse(savedReservations) : [];
        } catch (error) {
            console.error('Fehler beim Laden der Reservierungen:', error);
            this.reservations = [];
        }
    }
    
    loadLoginHistory() {
        try {
            const savedHistory = localStorage.getItem('loginHistory');
            this.loginHistory = savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error('Fehler beim Laden der Login-Historie:', error);
            this.loginHistory = [];
        }
    }
    
    applySettingsToUI() {
        // Allgemeine Einstellungen
        this.setValue('eventName', this.settings.general?.eventName || '');
        this.setValue('eventLocation', this.settings.general?.eventLocation || '');
        this.setValue('eventTime', this.settings.general?.eventTime || '19:00');
        this.setValue('doorsOpen', this.settings.general?.doorsOpen || '18:00');
        this.setChecked('systemActive', this.settings.general?.systemActive !== false);
        this.setValue('maxDailyReservations', this.settings.general?.maxDailyReservations || 50);
        this.setValue('maxReservationsPerUser', this.settings.general?.maxReservationsPerUser || 3);
        this.setValue('language', this.settings.general?.language || 'de');
        this.setValue('timezone', this.settings.general?.timezone || 'Europe/Berlin');
        this.setValue('dateFormat', this.settings.general?.dateFormat || 'de-DE');
        
        // Termine
        this.setValue('bookingStart', this.settings.dates?.bookingStart || '');
        this.setValue('bookingEnd', this.settings.dates?.bookingEnd || '');
        this.setValue('maxAdvanceDays', this.settings.dates?.maxAdvanceDays || 60);
        
        // Wochentage
        const weekdays = this.settings.dates?.weekdays || [1,2,3,4,5];
        document.querySelectorAll('.weekday-checkbox').forEach(checkbox => {
            checkbox.checked = weekdays.includes(parseInt(checkbox.value));
        });
        
        // Blockierte Termine anzeigen
        this.updateBlockedDatesList();
        
        // Sitzplan
        const mode = this.settings.seats?.mode || 'stage';
        this.setShowType(mode);
        
        this.setValue('seatRows', this.settings.seats?.rows || 8);
        this.setValue('seatsPerRow', this.settings.seats?.seatsPerRow || 10);
        this.setValue('stageName', this.settings.seats?.stageName || 'BÜHNE');
        this.setValue('aislePosition', this.settings.seats?.aislePosition || 'middle');
        this.setValue('groupCount', this.settings.seats?.groupCount || 10);
        this.setValue('slotsPerGroup', this.settings.seats?.slotsPerGroup || 6);
        this.setValue('groupName', this.settings.seats?.groupName || 'Tisch');
        this.setValue('groupLayout', this.settings.seats?.groupLayout || 'grid');
        this.setValue('maxSeatsPerBooking', this.settings.seats?.maxSeatsPerBooking || 8);
        this.setValue('minSeatsPerBooking', this.settings.seats?.minSeatsPerBooking || 1);
        this.setValue('seatSelectionMode', this.settings.seats?.seatSelectionMode || 'multiple');
        
        this.updateSeatPreview();
        
        // Preise
        this.setChecked('freeEvent', this.settings.prices?.freeEvent !== false);
        this.setValue('currency', this.settings.prices?.currency || 'EUR');
        this.setValue('taxRate', this.settings.prices?.taxRate || 19);
        this.setValue('seatPrice', this.settings.prices?.seatPrice || 10);
        this.setValue('vipPrice', this.settings.prices?.vipPrice || 15);
        this.setValue('vipRows', this.settings.prices?.vipRows || 2);
        this.setValue('groupPrice', this.settings.prices?.groupPrice || 50);
        this.setValue('slotPrice', this.settings.prices?.slotPrice || 8);
        this.setValue('discountGroups', this.settings.prices?.discountGroups || 5);
        this.setChecked('paymentCash', this.settings.prices?.paymentCash !== false);
        this.setChecked('paymentCard', this.settings.prices?.paymentCard !== false);
        this.setChecked('paymentOnline', this.settings.prices?.paymentOnline || false);
        this.setChecked('invoiceRequired', this.settings.prices?.invoiceRequired || false);
        this.setValue('earlyBirdDiscount', this.settings.prices?.earlyBirdDiscount || 10);
        this.setValue('groupDiscount', this.settings.prices?.groupDiscount || 15);
        
        this.togglePriceFields();
        
        // Design
        this.setValue('primaryColor', this.settings.design?.primaryColor || '#4CAF50');
        this.setValue('secondaryColor', this.settings.design?.secondaryColor || '#3498db');
        this.setValue('backgroundColor', this.settings.design?.backgroundColor || '#f8f9fa');
        this.setValue('fontFamily', this.settings.design?.fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif");
        this.setValue('fontSize', this.settings.design?.fontSize || 16);
        this.setValue('welcomeText', this.settings.design?.welcomeText || '');
        this.setValue('confirmationText', this.settings.design?.confirmationText || '');
        this.setValue('agbText', this.settings.design?.agbText || '');
        this.setValue('privacyText', this.settings.design?.privacyText || '');
        this.setValue('logoUrl', this.settings.design?.logoUrl || '');
        this.setValue('faviconUrl', this.settings.design?.faviconUrl || '');
        this.setValue('backgroundImage', this.settings.design?.backgroundImage || '');
        
        this.updateColorPreview();
        
        // System
        this.setValue('emailSender', this.settings.system?.emailSender || 'Reservierungssystem');
        this.setValue('emailFrom', this.settings.system?.emailFrom || '');
        this.setValue('smtpHost', this.settings.system?.smtpHost || '');
        this.setValue('smtpPort', this.settings.system?.smtpPort || 587);
        this.setChecked('analyticsEnabled', this.settings.system?.analyticsEnabled || false);
        this.setValue('gaId', this.settings.system?.gaId || '');
        this.setValue('autoBackup', this.settings.system?.autoBackup || 7);
        
        this.toggleAnalyticsFields();
    }
    
    setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value;
    }
    
    setChecked(id, checked) {
        const element = document.getElementById(id);
        if (element) element.checked = checked;
    }
    
    setupEventListeners() {
        // Logout Button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminLoginTime');
            window.location.href = 'admin.html';
        });
        
        // Tab Navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Save All Button
        document.getElementById('saveAllBtn').addEventListener('click', () => {
            this.saveAllSettings();
        });
        
        // Allgemein
        document.getElementById('saveGeneralBtn').addEventListener('click', () => {
            this.saveGeneralSettings();
        });
        
        // Termine
        document.getElementById('saveDatesBtn').addEventListener('click', () => {
            this.saveDatesSettings();
        });
        
        document.getElementById('addBlockedDateBtn').addEventListener('click', () => {
            this.addBlockedDate();
        });
        
        // Kalender Navigation
        document.getElementById('calendarPrevMonth')?.addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('calendarNextMonth')?.addEventListener('click', () => {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Datums-Auswahl-Aktionen
        document.getElementById('selectAllDates')?.addEventListener('click', () => {
            this.selectAllDatesInMonth();
        });
        
        document.getElementById('clearDateSelection')?.addEventListener('click', () => {
            this.selectedDates.clear();
            this.updateSelectedDatesList();
            this.renderCalendar();
        });
        
        document.getElementById('blockSelectedDates')?.addEventListener('click', () => {
            this.blockSelectedDates();
        });
        
        // Sitzplan
        document.getElementById('saveSeatsBtn').addEventListener('click', () => {
            this.saveSeatsSettings();
        });
        
        // Show-Typ Toggle
        document.querySelectorAll('.show-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.showType;
                this.setShowType(type);
            });
        });
        
        // Sitzplan Live-Vorschau Updates - KORRIGIERT
        ['seatRows', 'seatsPerRow', 'stageName', 'groupCount', 'slotsPerGroup', 'groupName'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    setTimeout(() => this.updateSeatPreview(), 100);
                });
                element.addEventListener('change', () => {
                    setTimeout(() => this.updateSeatPreview(), 100);
                });
            }
        });
        
        // Preise
        document.getElementById('savePricesBtn').addEventListener('click', () => {
            this.savePricesSettings();
        });
        
        document.getElementById('freeEvent').addEventListener('change', () => {
            this.togglePriceFields();
        });
        
        // Design
        document.getElementById('saveDesignBtn').addEventListener('click', () => {
            this.saveDesignSettings();
        });
        
        // Farben Live-Vorschau
        ['primaryColor', 'secondaryColor', 'backgroundColor'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.updateColorPreview();
                    // CSS Variablen live aktualisieren
                    if (id === 'primaryColor') {
                        document.documentElement.style.setProperty('--primary-color', e.target.value);
                    } else if (id === 'secondaryColor') {
                        document.documentElement.style.setProperty('--secondary-color', e.target.value);
                    }
                });
            }
        });
        
        // System
        document.getElementById('analyticsEnabled').addEventListener('change', () => {
            this.toggleAnalyticsFields();
        });
        
        document.getElementById('saveSystemBtn').addEventListener('click', () => {
            this.saveSystemSettings();
        });
        
        document.getElementById('backupDataBtn').addEventListener('click', () => {
            this.createBackup();
        });
        
        document.getElementById('restoreDataBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('exportSettingsBtn').addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('importSettingsBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('clearCacheBtn').addEventListener('click', () => {
            this.clearCache();
        });
        
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            this.showConfirmDialog(
                'Einstellungen zurücksetzen?',
                'Alle Einstellungen werden auf Standardwerte zurückgesetzt.',
                () => this.resetSettings()
            );
        });
        
        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.showConfirmDialog(
                'Alles zurücksetzen?',
                'ALLE Daten werden gelöscht: Einstellungen, Reservierungen. Diese Aktion kann nicht rückgängig gemacht werden!',
                () => this.resetAll()
            );
        });
        
        // Reservierungen
        document.getElementById('searchReservations')?.addEventListener('input', (e) => {
            this.filterReservations(e.target.value);
        });
        
        document.getElementById('exportReservationsBtn')?.addEventListener('click', () => {
            this.exportReservationsCSV(); // GEÄNDERT: CSV statt JSON
        });
        
        document.getElementById('exportAllBtn')?.addEventListener('click', () => {
            this.exportAllReservationsCSV(); // GEÄNDERT: CSV statt JSON
        });
        
        document.getElementById('deleteAllReservationsBtn')?.addEventListener('click', () => {
            this.showConfirmDialog(
                'Alle Reservierungen löschen?',
                'Diese Aktion kann nicht rückgängig gemacht werden. Alle Buchungen gehen verloren.',
                () => this.deleteAllReservations()
            );
        });
        
        // File Input für Import
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files[0]);
        });
        
        // Dialog Buttons
        document.getElementById('dialogCancel').addEventListener('click', () => {
            this.hideConfirmDialog();
        });
        
        document.getElementById('dialogConfirm').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
                this.hideConfirmDialog();
            }
        });
        
        // Status-Änderung in Reservierungstabelle
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('status-select')) {
                const timestamp = e.target.dataset.timestamp;
                const newStatus = e.target.value;
                this.updateReservationStatus(timestamp, newStatus);
            }
        });
    }
    
    // ==================== KALENDER FUNKTIONEN ====================
    
    initCalendar() {
        this.renderCalendar();
    }
    
    renderCalendar() {
        const monthEl = document.getElementById('calendarMonth');
        const datesEl = document.getElementById('calendarDates');
        
        if (!monthEl || !datesEl) return;
        
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        
        // Monatsname anzeigen
        monthEl.textContent = this.calendarDate.toLocaleDateString('de-DE', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Erster Tag des Monats
        const firstDay = new Date(year, month, 1);
        // Letzter Tag des Monats
        const lastDay = new Date(year, month + 1, 0);
        // Anzahl der Tage im Monat
        const daysInMonth = lastDay.getDate();
        // Erster Wochentag (0 = Sonntag, 1 = Montag, etc.)
        let firstDayIndex = firstDay.getDay();
        if (firstDayIndex === 0) firstDayIndex = 6; // Sonntag ans Ende
        else firstDayIndex--; // Anpassung für Montag als ersten Tag
        
        // Tage-Container leeren
        datesEl.innerHTML = '';
        
        // Leere Tage am Anfang
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-date disabled';
            emptyDay.innerHTML = '&nbsp;';
            datesEl.appendChild(emptyDay);
        }
        
        // Tage des Monats
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDate(date);
            
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-date';
            dayEl.textContent = day;
            dayEl.dataset.date = dateStr;
            
            // Prüfen ob Datum blockiert
            if (this.blockedDates.has(dateStr)) {
                dayEl.classList.add('blocked');
            }
            // Prüfen ob Datum ausgewählt
            else if (this.selectedDates.has(dateStr)) {
                dayEl.classList.add('selected');
            }
            
            // Klick-Event
            dayEl.addEventListener('click', () => {
                this.toggleDateSelection(dateStr);
            });
            
            datesEl.appendChild(dayEl);
        }
    }
    
    toggleDateSelection(dateStr) {
        if (!dateStr || this.blockedDates.has(dateStr)) return;
        
        if (this.selectedDates.has(dateStr)) {
            this.selectedDates.delete(dateStr);
        } else {
            this.selectedDates.add(dateStr);
        }
        
        this.updateSelectedDatesList();
        this.renderCalendar();
    }
    
    selectAllDatesInMonth() {
        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDate(date);
            
            // Nicht blockierte Daten hinzufügen
            if (!this.blockedDates.has(dateStr)) {
                this.selectedDates.add(dateStr);
            }
        }
        
        this.updateSelectedDatesList();
        this.renderCalendar();
    }
    
    blockSelectedDates() {
        if (this.selectedDates.size === 0) return;
        
        // Ausgewählte Daten zu blockierten Daten hinzufügen
        this.selectedDates.forEach(dateStr => {
            this.blockedDates.add(dateStr);
            this.selectedDates.delete(dateStr);
        });
        
        this.updateSelectedDatesList();
        this.updateBlockedDatesList();
        this.renderCalendar();
        
        this.showSuccessMessage(`${this.selectedDates.size} Termine blockiert`);
    }
    
    addBlockedDate() {
        const dateInput = document.getElementById('blockDateInput');
        if (!dateInput.value) return;

        const dateStr = dateInput.value;
        if (!this.blockedDates.has(dateStr)) {
            this.blockedDates.add(dateStr);
            this.selectedDates.delete(dateStr);
            this.updateBlockedDatesList();
            this.updateSelectedDatesList();
            this.renderCalendar();
            dateInput.value = '';
            this.showSuccessMessage('Termin blockiert');
        }
    }
    
    removeBlockedDate(dateStr) {
        this.blockedDates.delete(dateStr);
        this.updateBlockedDatesList();
        this.renderCalendar();
        this.showSuccessMessage('Blockierung entfernt');
    }
    
    updateSelectedDatesList() {
        const listEl = document.getElementById('selectedDatesList');
        if (!listEl) return;
        
        if (this.selectedDates.size === 0) {
            listEl.innerHTML = '<p style="color: #666; font-style: italic;">Keine Termine ausgewählt</p>';
            return;
        }
        
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 10px; max-height: 200px; overflow-y: auto;">';
        
        Array.from(this.selectedDates).sort().forEach(dateStr => {
            const date = new Date(dateStr);
            const formatted = date.toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            html += `
                <div style="background: #e8f5e9; padding: 8px 12px; border-radius: 5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar-check" style="color: #4CAF50;"></i>
                    <span>${formatted}</span>
                </div>
            `;
        });
        
        html += '</div>';
        listEl.innerHTML = html;
    }
    
    updateBlockedDatesList() {
        const list = document.getElementById('blockedDatesList');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.blockedDates.size === 0) {
            list.innerHTML = '<li style="color: #666; font-style: italic;">Keine blockierten Termine</li>';
            return;
        }
        
        Array.from(this.blockedDates).sort().forEach(dateStr => {
            const date = new Date(dateStr);
            const formatted = date.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const li = document.createElement('li');
            li.innerHTML = `
                ${formatted}
                <button class="action-btn delete" onclick="adminPanel.removeBlockedDate('${dateStr}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            list.appendChild(li);
        });
    }
    
    // ==================== SITZPLAN FUNKTIONEN ====================
    
    setShowType(type) {
        // Buttons aktivieren/deaktivieren
        document.querySelectorAll('.show-type-btn').forEach(btn => {
            if (btn.dataset.showType === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Einstellungen anzeigen/ausblenden
        const stageSettings = document.getElementById('stageSettings');
        const groupSettings = document.getElementById('groupSettings');
        const stagePrices = document.getElementById('stagePrices');
        const groupPrices = document.getElementById('groupPrices');
        const seatPreview = document.getElementById('seatPreviewGrid');
        const groupPreview = document.getElementById('groupPreview');
        
        if (type === 'stage') {
            if (stageSettings) stageSettings.style.display = 'block';
            if (groupSettings) groupSettings.style.display = 'none';
            if (stagePrices) stagePrices.style.display = 'block';
            if (groupPrices) groupPrices.style.display = 'none';
            if (seatPreview) {
                seatPreview.style.display = 'grid';
                seatPreview.style.gridTemplateColumns = 'repeat(10, 1fr)';
            }
            if (groupPreview) groupPreview.style.display = 'none';
        } else {
            if (stageSettings) stageSettings.style.display = 'none';
            if (groupSettings) groupSettings.style.display = 'block';
            if (stagePrices) stagePrices.style.display = 'none';
            if (groupPrices) groupPrices.style.display = 'block';
            if (seatPreview) seatPreview.style.display = 'none';
            if (groupPreview) groupPreview.style.display = 'flex';
        }
        
        this.updateSeatPreview();
    }
    
    updateSeatPreview() {
        const activeBtn = document.querySelector('.show-type-btn.active');
        if (!activeBtn) return;
        
        const type = activeBtn.dataset.showType;
        
        if (type === 'stage') {
            this.updateStagePreview();
        } else {
            this.updateGroupPreview();
        }
    }
    
    updateStagePreview() {
        const previewGrid = document.getElementById('seatPreviewGrid');
        const stageName = document.getElementById('stageName')?.value || 'BÜHNE';
        
        if (!previewGrid) return;
        
        const rows = parseInt(document.getElementById('seatRows')?.value) || 8;
        const seatsPerRow = parseInt(document.getElementById('seatsPerRow')?.value) || 10;
        
        // KORREKTUR: Preview begrenzen auf max 8 Reihen und 12 Sitze für bessere Darstellung
        const maxRowsToShow = 8;
        const maxSeatsPerRowToShow = 12;
        
        const showRows = Math.min(rows, maxRowsToShow);
        const showSeatsPerRow = Math.min(seatsPerRow, maxSeatsPerRowToShow);
        
        // Grid Layout dynamisch anpassen
        previewGrid.style.gridTemplateColumns = `repeat(${showSeatsPerRow}, 25px)`;
        previewGrid.style.gap = '4px';
        previewGrid.style.justifyContent = 'center';
        
        previewGrid.innerHTML = '';
        
        // Bühnenname in Vorschau aktualisieren
        const previewStage = document.getElementById('previewStage');
        if (previewStage) {
            previewStage.textContent = stageName;
            previewStage.style.marginBottom = '15px';
        }
        
        // Reihen und Sitze generieren - KORRIGIERT
        const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        for (let row = 0; row < showRows; row++) {
            for (let seatNum = 1; seatNum <= showSeatsPerRow; seatNum++) {
                const seatEl = document.createElement('div');
                seatEl.className = 'preview-seat';
                seatEl.textContent = seatNum;
                seatEl.style.width = '20px';
                seatEl.style.height = '20px';
                seatEl.style.fontSize = '10px';
                seatEl.style.display = 'flex';
                seatEl.style.alignItems = 'center';
                seatEl.style.justifyContent = 'center';
                seatEl.style.background = '#e8f5e9';
                seatEl.style.border = '2px solid #c8e6c9';
                seatEl.style.borderRadius = '4px';
                seatEl.style.color = '#2e7d32';
                seatEl.style.fontWeight = 'bold';
                
                // Wenn mehr Reihen/Sitze vorhanden sind als angezeigt, Hinweis geben
                if (row === showRows - 1 && rows > showRows) {
                    seatEl.textContent = '...';
                    seatEl.title = `${rows} Reihen insgesamt (nur ${showRows} in Vorschau)`;
                } else if (seatNum === showSeatsPerRow && seatsPerRow > showSeatsPerRow) {
                    seatEl.textContent = '...';
                    seatEl.title = `${seatsPerRow} Sitze pro Reihe (nur ${showSeatsPerRow} in Vorschau)`;
                }
                
                previewGrid.appendChild(seatEl);
            }
        }
        
        // Info-Text hinzufügen
        const infoText = document.createElement('div');
        infoText.style.gridColumn = `1 / span ${showSeatsPerRow}`;
        infoText.style.textAlign = 'center';
        infoText.style.fontSize = '11px';
        infoText.style.color = '#666';
        infoText.style.marginTop = '5px';
        
        if (rows > showRows || seatsPerRow > showSeatsPerRow) {
            infoText.textContent = `Vorschau: ${showRows} von ${rows} Reihen, ${showSeatsPerRow} von ${seatsPerRow} Sitzen`;
        } else {
            infoText.textContent = `${rows} Reihen × ${seatsPerRow} Sitze`;
        }
        
        previewGrid.appendChild(infoText);
    }
    
    updateGroupPreview() {
        const previewEl = document.getElementById('groupPreview');
        const groupName = document.getElementById('groupName')?.value || 'Tisch';
        
        if (!previewEl) return;
        
        const groupCount = parseInt(document.getElementById('groupCount')?.value) || 10;
        const slotsPerGroup = parseInt(document.getElementById('slotsPerGroup')?.value) || 6;
        
        // Preview begrenzen
        const maxGroupsToShow = 6;
        const maxSlotsPerGroupToShow = 6;
        
        const showGroups = Math.min(groupCount, maxGroupsToShow);
        const showSlots = Math.min(slotsPerGroup, maxSlotsPerGroupToShow);
        
        previewEl.innerHTML = '';
        
        for (let group = 1; group <= showGroups; group++) {
            const groupEl = document.createElement('div');
            groupEl.className = 'group-item';
            groupEl.style.width = '100px';
            groupEl.style.height = '100px';
            groupEl.style.background = '#e8f5e9';
            groupEl.style.border = '2px solid #c8e6c9';
            groupEl.style.borderRadius = '10px';
            groupEl.style.display = 'flex';
            groupEl.style.flexDirection = 'column';
            groupEl.style.alignItems = 'center';
            groupEl.style.justifyContent = 'center';
            groupEl.style.position = 'relative';
            
            let slotsHtml = '';
            for (let slot = 1; slot <= showSlots; slot++) {
                slotsHtml += `<div style="width: 15px; height: 15px; background: #c8e6c9; border-radius: 3px; font-size: 9px; display: flex; align-items: center; justify-content: center; margin: 1px;">${slot}</div>`;
            }
            
            groupEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px; color: #2e7d32; font-size: 12px;">${groupName} ${group}</div>
                <div style="display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; width: 70px;">
                    ${slotsHtml}
                </div>
            `;
            
            previewEl.appendChild(groupEl);
        }
        
        // Info-Text hinzufügen
        if (groupCount > maxGroupsToShow || slotsPerGroup > maxSlotsPerGroupToShow) {
            const infoText = document.createElement('div');
            infoText.style.width = '100%';
            infoText.style.textAlign = 'center';
            infoText.style.fontSize = '11px';
            infoText.style.color = '#666';
            infoText.style.marginTop = '10px';
            infoText.textContent = `Vorschau: ${showGroups} von ${groupCount} Gruppen, ${showSlots} von ${slotsPerGroup} Slots`;
            previewEl.appendChild(infoText);
        }
    }
    
    // ==================== PREIS FUNKTIONEN ====================
    
    togglePriceFields() {
        const freeEvent = document.getElementById('freeEvent').checked;
        const activeBtn = document.querySelector('.show-type-btn.active');
        if (!activeBtn) return;
        
        const mode = activeBtn.dataset.showType;
        
        if (mode === 'stage') {
            document.getElementById('seatPrice').disabled = freeEvent;
            document.getElementById('vipPrice').disabled = freeEvent;
        } else {
            document.getElementById('groupPrice').disabled = freeEvent;
            document.getElementById('slotPrice').disabled = freeEvent;
        }
    }
    
    toggleAnalyticsFields() {
        const analyticsEnabled = document.getElementById('analyticsEnabled').checked;
        document.getElementById('gaId').disabled = !analyticsEnabled;
    }
    
    // ==================== DESIGN FUNKTIONEN ====================
    
    updateColorPreview() {
        const primaryColor = document.getElementById('primaryColor')?.value || '#4CAF50';
        const secondaryColor = document.getElementById('secondaryColor')?.value || '#3498db';
        const backgroundColor = document.getElementById('backgroundColor')?.value || '#f8f9fa';
        
        const colorBoxes = document.querySelectorAll('.color-box');
        if (colorBoxes.length >= 3) {
            colorBoxes[0].style.background = primaryColor;
            colorBoxes[1].style.background = secondaryColor;
            colorBoxes[2].style.background = backgroundColor;
            colorBoxes[2].style.border = backgroundColor === '#ffffff' ? '1px solid #ccc' : 'none';
        }
    }
    
    // ==================== RESERVIERUNGEN FUNKTIONEN ====================
    
    filterReservations(searchTerm) {
        const table = document.getElementById('reservationsTable');
        if (!table) return;
        
        const rows = table.getElementsByTagName('tr');
        
        for (let row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        }
    }
    
    updateReservationsTable() {
        const table = document.getElementById('reservationsTable');
        const recentTable = document.getElementById('recentReservationsTable');
        
        if (!table || !recentTable) return;
        
        table.innerHTML = '';
        recentTable.innerHTML = '';
        
        // Statistiken
        let confirmed = 0;
        let pending = 0;
        let cancelled = 0;
        let totalRevenue = 0;
        
        // Letzte 10 Reservierungen für Dashboard
        const recentReservations = [...this.reservations]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        recentReservations.forEach(reservation => {
            // Status bestimmen für Badge
            const status = reservation.status || 'ausstehend';
            const statusClass = status === 'bestätigt' ? 'status-confirmed' : 
                              status === 'storniert' ? 'status-cancelled' : 'status-pending';
            const statusText = status === 'bestätigt' ? 'Bestätigt' : 
                             status === 'storniert' ? 'Storniert' : 'Ausstehend';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.dateFormatted || reservation.date}</td>
                <td>${reservation.firstName || ''} ${reservation.lastName || ''}</td>
                <td>${Array.isArray(reservation.seats) ? reservation.seats.join(', ') : (reservation.groups ? reservation.groups.join(', ') : '-')}</td>
                <td>${reservation.total || 'Kostenlos'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn" onclick="adminPanel.viewReservation('${reservation.timestamp}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="action-btn delete" onclick="adminPanel.deleteReservation('${reservation.timestamp}')">
                        <i class="fas fa-trash"></i> Löschen
                    </button>
                </td>
            `;
            recentTable.appendChild(row);
        });
        
        // Alle Reservierungen für Reservierungen-Tab
        this.reservations.forEach(reservation => {
            // Status zählen
            const status = reservation.status || 'ausstehend';
            if (status === 'bestätigt') confirmed++;
            else if (status === 'ausstehend') pending++;
            else if (status === 'storniert') cancelled++;
            
            // Umsatz berechnen (wenn kostenpflichtig)
            if (reservation.total && reservation.total !== 'Kostenlos') {
                const amount = parseFloat(reservation.total.replace('€', '').replace(',', '.')) || 0;
                totalRevenue += amount;
            }
            
            // Status für Dropdown
            const statusValue = reservation.status || 'ausstehend';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reservation.reservationNumber || 'RSV-' + (reservation.timestamp?.slice(-8) || '')}</td>
                <td>${reservation.dateFormatted || reservation.date}</td>
                <td>${reservation.firstName || ''} ${reservation.lastName || ''}</td>
                <td>${reservation.email || ''}</td>
                <td>${Array.isArray(reservation.seats) ? reservation.seats.join(', ') : (reservation.groups ? reservation.groups.join(', ') : '-')}</td>
                <td>${reservation.total || 'Kostenlos'}</td>
                <td>
                    <select class="status-select" data-timestamp="${reservation.timestamp}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; width: 100%;">
                        <option value="ausstehend" ${statusValue === 'ausstehend' ? 'selected' : ''}>Ausstehend</option>
                        <option value="bestätigt" ${statusValue === 'bestätigt' ? 'selected' : ''}>Bestätigt</option>
                        <option value="storniert" ${statusValue === 'storniert' ? 'selected' : ''}>Storniert</option>
                    </select>
                </td>
                <td>${new Date(reservation.timestamp).toLocaleString('de-DE')}</td>
                <td>
                    <button class="action-btn" onclick="adminPanel.viewReservation('${reservation.timestamp}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="adminPanel.deleteReservation('${reservation.timestamp}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            table.appendChild(row);
        });
        
        // Statistiken aktualisieren
        const confirmedEl = document.getElementById('confirmedCount');
        const pendingEl = document.getElementById('pendingCount');
        const cancelledEl = document.getElementById('cancelledCount');
        const revenueEl = document.getElementById('totalRevenueReservations');
        
        if (confirmedEl) confirmedEl.textContent = confirmed;
        if (pendingEl) pendingEl.textContent = pending;
        if (cancelledEl) cancelledEl.textContent = cancelled;
        if (revenueEl) revenueEl.textContent = `€${totalRevenue.toFixed(2)}`;
        
        // Dashboard Statistiken aktualisieren
        document.getElementById('totalReservations').textContent = this.reservations.length;
        document.getElementById('totalRevenue').textContent = `€${totalRevenue.toFixed(2)}`;
    }
    
    updateReservationStatus(timestamp, newStatus) {
        const reservationIndex = this.reservations.findIndex(r => r.timestamp === timestamp);
        
        if (reservationIndex !== -1) {
            this.reservations[reservationIndex].status = newStatus;
            localStorage.setItem('reservations', JSON.stringify(this.reservations));
            
            this.showSuccessMessage(`Status aktualisiert auf: ${newStatus}`);
            this.updateReservationsTable();
            this.updateDashboard();
        }
    }
    
    deleteReservation(timestamp) {
        this.showConfirmDialog(
            'Reservierung löschen?',
            'Diese Aktion kann nicht rückgängig gemacht werden.',
            () => {
                this.reservations = this.reservations.filter(r => r.timestamp !== timestamp);
                localStorage.setItem('reservations', JSON.stringify(this.reservations));
                this.updateReservationsTable();
                this.updateDashboard();
                this.showSuccessMessage('Reservierung gelöscht');
            }
        );
    }
    
    deleteAllReservations() {
        this.reservations = [];
        localStorage.removeItem('reservations');
        this.updateReservationsTable();
        this.updateDashboard();
        this.showSuccessMessage('Alle Reservierungen gelöscht');
    }
    
    viewReservation(timestamp) {
        const reservation = this.reservations.find(r => r.timestamp === timestamp);
        if (reservation) {
            let details = `=== RESERVIERUNGSDETAILS ===\n\n`;
            details += `Reservierungsnummer: ${reservation.reservationNumber || 'RSV-' + reservation.timestamp?.slice(-8)}\n`;
            details += `Datum: ${reservation.dateFormatted || reservation.date}\n`;
            details += `Sitze: ${Array.isArray(reservation.seats) ? reservation.seats.join(', ') : '-'}\n`;
            details += `Gruppen: ${Array.isArray(reservation.groups) ? reservation.groups.join(', ') : '-'}\n`;
            details += `Name: ${reservation.firstName || ''} ${reservation.lastName || ''}\n`;
            details += `Email: ${reservation.email || ''}\n`;
            details += `Telefon: ${reservation.phone || ''}\n`;
            details += `Gesamt: ${reservation.total || 'Kostenlos'}\n`;
            details += `Bemerkungen: ${reservation.notes || 'Keine'}\n`;
            details += `Status: ${reservation.status || 'Ausstehend'}\n`;
            details += `Buchungszeitpunkt: ${new Date(reservation.timestamp).toLocaleString('de-DE')}\n`;
            details += `IP-Adresse: ${reservation.ip || 'unbekannt'}\n`;
            
            alert(details);
        }
    }
    
    // ==================== SYSTEM FUNKTIONEN ====================
    
    updateSystemInfo() {
        // Browser Info
        const browserInfo = navigator.userAgent;
        document.getElementById('browserInfo').textContent = browserInfo.length > 30 ? browserInfo.substring(0, 30) + '...' : browserInfo;
        
        // LocalStorage Info
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += (localStorage[key].length + key.length) * 2;
            }
        }
        document.getElementById('localStorageInfo').textContent = `${(totalSize / 1024).toFixed(2)} KB`;
        
        // Version
        document.getElementById('systemVersion').textContent = this.settings.system?.version || '1.0.0';
        
        // Letztes Update
        if (this.settings.system?.lastUpdate) {
            const date = new Date(this.settings.system.lastUpdate);
            document.getElementById('lastUpdate').textContent = date.toLocaleString('de-DE');
        } else {
            document.getElementById('lastUpdate').textContent = 'Nie';
        }
    }
    
    createBackup() {
        const backup = {
            settings: this.settings,
            reservations: this.reservations,
            loginHistory: this.loginHistory,
            timestamp: new Date().toISOString(),
            version: this.settings.system?.version || '1.0.0'
        };
        
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reservierungssystem_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Backup erfolgreich erstellt');
    }
    
    handleFileImport(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                this.showConfirmDialog(
                    'Daten importieren?',
                    'Bestehende Daten werden überschrieben. Fortfahren?',
                    () => {
                        if (data.settings) {
                            this.settings = data.settings;
                            localStorage.setItem('adminSettings', JSON.stringify(this.settings));
                        }
                        
                        if (data.reservations) {
                            this.reservations = data.reservations;
                            localStorage.setItem('reservations', JSON.stringify(this.reservations));
                        }
                        
                        if (data.loginHistory) {
                            this.loginHistory = data.loginHistory;
                            localStorage.setItem('loginHistory', JSON.stringify(this.loginHistory));
                        }
                        
                        this.applySettingsToUI();
                        this.updateReservationsTable();
                        this.updateDashboard();
                        
                        this.showSuccessMessage('Daten erfolgreich importiert');
                    }
                );
            } catch (error) {
                alert('Fehler beim Lesen der Datei. Stellen Sie sicher, dass es eine gültige Backup-Datei ist.');
            }
        };
        reader.readAsText(file);
    }
    
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reservierungssystem_settings_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Einstellungen exportiert');
    }
    
    // NEU: CSV-Export für Reservierungen
    exportReservationsCSV() {
        if (this.reservations.length === 0) {
            alert('Keine Reservierungen zum Exportieren vorhanden.');
            return;
        }
        
        // CSV-Header
        let csv = 'Reservierungsnummer;Datum;Name;Email;Telefon;Sitze;Gruppen;Gesamtbetrag;Status;Bemerkungen;Buchungszeitpunkt\n';
        
        // Daten hinzufügen
        this.reservations.forEach(reservation => {
            const row = [
                reservation.reservationNumber || '',
                reservation.dateFormatted || reservation.date || '',
                `"${(reservation.firstName || '')} ${(reservation.lastName || '')}"`,
                reservation.email || '',
                reservation.phone || '',
                Array.isArray(reservation.seats) ? `"${reservation.seats.join(', ')}"` : '',
                Array.isArray(reservation.groups) ? `"${reservation.groups.join(', ')}"` : '',
                reservation.total || 'Kostenlos',
                reservation.status || 'ausstehend',
                `"${(reservation.notes || '').replace(/"/g, '""')}"`,
                new Date(reservation.timestamp).toLocaleString('de-DE')
            ];
            
            csv += row.join(';') + '\n';
        });
        
        // CSV-Datei erstellen und herunterladen
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reservierungen_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Reservierungen als CSV exportiert');
    }
    
    // NEU: Alle Reservierungen als CSV exportieren
    exportAllReservationsCSV() {
        if (this.reservations.length === 0) {
            alert('Keine Reservierungen zum Exportieren vorhanden.');
            return;
        }
        
        // Detaillierter CSV-Export
        let csv = 'Reservierungsnummer;Datum;Vorname;Nachname;Email;Telefon;Sitze;Gruppen;Gesamtbetrag;Status;Bemerkungen;IP-Adresse;Buchungszeitpunkt;Bestätigungszeitpunkt\n';
        
        this.reservations.forEach(reservation => {
            const row = [
                reservation.reservationNumber || '',
                reservation.dateFormatted || reservation.date || '',
                reservation.firstName || '',
                reservation.lastName || '',
                reservation.email || '',
                reservation.phone || '',
                Array.isArray(reservation.seats) ? `"${reservation.seats.join(', ')}"` : '',
                Array.isArray(reservation.groups) ? `"${reservation.groups.join(', ')}"` : '',
                reservation.total || 'Kostenlos',
                reservation.status || 'ausstehend',
                `"${(reservation.notes || '').replace(/"/g, '""')}"`,
                reservation.ip || 'unbekannt',
                new Date(reservation.timestamp).toLocaleString('de-DE'),
                reservation.confirmedTimestamp ? new Date(reservation.confirmedTimestamp).toLocaleString('de-DE') : ''
            ];
            
            csv += row.join(';') + '\n';
        });
        
        // Statistik-Zusammenfassung
        csv += '\n\n=== STATISTIK ===\n';
        csv += `Gesamtzahl Reservierungen;${this.reservations.length}\n`;
        
        const confirmed = this.reservations.filter(r => r.status === 'bestätigt').length;
        const pending = this.reservations.filter(r => r.status === 'ausstehend').length;
        const cancelled = this.reservations.filter(r => r.status === 'storniert').length;
        
        csv += `Bestätigte Reservierungen;${confirmed}\n`;
        csv += `Ausstehende Reservierungen;${pending}\n`;
        csv += `Stornierte Reservierungen;${cancelled}\n`;
        
        // Umsatz berechnen
        let totalRevenue = 0;
        this.reservations.forEach(r => {
            if (r.total && r.total !== 'Kostenlos') {
                const amount = parseFloat(r.total.replace('€', '').replace(',', '.')) || 0;
                totalRevenue += amount;
            }
        });
        
        csv += `Gesamtumsatz;€${totalRevenue.toFixed(2)}\n`;
        csv += `Exportdatum;${new Date().toLocaleString('de-DE')}\n`;
        
        // CSV-Datei erstellen und herunterladen
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `alle_reservierungen_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Alle Reservierungen als CSV exportiert');
    }
    
    exportReservations() {
        const dataStr = JSON.stringify(this.reservations, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reservierungen_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Reservierungen exportiert');
    }
    
    exportAllReservations() {
        const exportData = {
            reservations: this.reservations,
            exportDate: new Date().toISOString(),
            total: this.reservations.length,
            summary: {
                confirmed: this.reservations.filter(r => r.status === 'bestätigt').length,
                pending: this.reservations.filter(r => r.status === 'ausstehend').length,
                cancelled: this.reservations.filter(r => r.status === 'storniert').length
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `alle_reservierungen_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage('Alle Reservierungen exportiert');
    }
    
    clearCache() {
        // Nur nicht-essentielle Daten löschen
        const essentialKeys = ['adminSettings', 'reservations', 'loginHistory', 'adminLoggedIn', 'adminLoginTime', 'loginConfig'];
        
        for (let key in localStorage) {
            if (!essentialKeys.includes(key)) {
                localStorage.removeItem(key);
            }
        }
        
        this.showSuccessMessage('Cache geleert');
    }
    
    resetSettings() {
        // Nur Einstellungen zurücksetzen
        localStorage.removeItem('adminSettings');
        this.settings = {};
        this.loadSettings();
        this.applySettingsToUI();
        this.showSuccessMessage('Einstellungen zurückgesetzt');
    }
    
    resetAll() {
        // ALLES löschen
        localStorage.clear();
        this.showSuccessMessage('Alle Daten zurückgesetzt');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    }
    
    // ==================== EINSTELLUNGEN SPEICHERN ====================
    
    saveAllSettings() {
        this.saveGeneralSettings();
        this.saveDatesSettings();
        this.saveSeatsSettings();
        this.savePricesSettings();
        this.saveDesignSettings();
        this.saveSystemSettings();
        this.showSuccessMessage('Alle Einstellungen gespeichert!');
    }
    
    saveGeneralSettings() {
        this.settings.general = {
            eventName: document.getElementById('eventName').value,
            eventLocation: document.getElementById('eventLocation').value,
            eventTime: document.getElementById('eventTime').value,
            doorsOpen: document.getElementById('doorsOpen').value,
            systemActive: document.getElementById('systemActive').checked,
            maxDailyReservations: parseInt(document.getElementById('maxDailyReservations').value) || 50,
            maxReservationsPerUser: parseInt(document.getElementById('maxReservationsPerUser').value) || 3,
            language: document.getElementById('language').value,
            timezone: document.getElementById('timezone').value,
            dateFormat: document.getElementById('dateFormat').value
        };
        
        this.saveSettings();
        this.showSuccessMessage('Allgemeine Einstellungen gespeichert');
    }
    
    saveDatesSettings() {
        // Wochentage
        const weekdays = [];
        document.querySelectorAll('.weekday-checkbox:checked').forEach(checkbox => {
            weekdays.push(parseInt(checkbox.value));
        });
        
        this.settings.dates = {
            availableDates: Array.from(this.selectedDates),
            blockedDates: Array.from(this.blockedDates),
            weekdays: weekdays.length > 0 ? weekdays : [1,2,3,4,5],
            bookingStart: document.getElementById('bookingStart').value,
            bookingEnd: document.getElementById('bookingEnd').value,
            maxAdvanceDays: parseInt(document.getElementById('maxAdvanceDays').value) || 60
        };
        
        this.saveSettings();
        this.showSuccessMessage('Termin-Einstellungen gespeichert');
    }
    
    saveSeatsSettings() {
        const activeBtn = document.querySelector('.show-type-btn.active');
        const mode = activeBtn ? activeBtn.dataset.showType : 'stage';
        
        this.settings.seats = {
            mode: mode,
            rows: parseInt(document.getElementById('seatRows').value) || 8,
            seatsPerRow: parseInt(document.getElementById('seatsPerRow').value) || 10,
            stageName: document.getElementById('stageName').value,
            aislePosition: document.getElementById('aislePosition').value,
            groupCount: parseInt(document.getElementById('groupCount').value) || 10,
            slotsPerGroup: parseInt(document.getElementById('slotsPerGroup').value) || 6,
            groupName: document.getElementById('groupName').value,
            groupLayout: document.getElementById('groupLayout').value,
            maxSeatsPerBooking: parseInt(document.getElementById('maxSeatsPerBooking').value) || 8,
            minSeatsPerBooking: parseInt(document.getElementById('minSeatsPerBooking').value) || 1,
            seatSelectionMode: document.getElementById('seatSelectionMode').value
        };
        
        this.saveSettings();
        this.updateSeatPreview();
        this.showSuccessMessage('Sitzplan-Einstellungen gespeichert');
    }
    
    savePricesSettings() {
        const activeBtn = document.querySelector('.show-type-btn.active');
        const mode = activeBtn ? activeBtn.dataset.showType : 'stage';
        
        this.settings.prices = {
            freeEvent: document.getElementById('freeEvent').checked,
            currency: document.getElementById('currency').value,
            taxRate: parseFloat(document.getElementById('taxRate').value) || 19,
            seatPrice: parseFloat(document.getElementById('seatPrice').value) || 10,
            vipPrice: parseFloat(document.getElementById('vipPrice').value) || 15,
            vipRows: parseInt(document.getElementById('vipRows').value) || 2,
            groupPrice: parseFloat(document.getElementById('groupPrice').value) || 50,
            slotPrice: parseFloat(document.getElementById('slotPrice').value) || 8,
            discountGroups: parseInt(document.getElementById('discountGroups').value) || 5,
            paymentCash: document.getElementById('paymentCash').checked,
            paymentCard: document.getElementById('paymentCard').checked,
            paymentOnline: document.getElementById('paymentOnline').checked,
            invoiceRequired: document.getElementById('invoiceRequired').checked,
            earlyBirdDiscount: parseFloat(document.getElementById('earlyBirdDiscount').value) || 10,
            groupDiscount: parseFloat(document.getElementById('groupDiscount').value) || 15
        };
        
        this.saveSettings();
        this.showSuccessMessage('Preis-Einstellungen gespeichert');
    }
    
    saveDesignSettings() {
        this.settings.design = {
            primaryColor: document.getElementById('primaryColor').value,
            secondaryColor: document.getElementById('secondaryColor').value,
            backgroundColor: document.getElementById('backgroundColor').value,
            fontFamily: document.getElementById('fontFamily').value,
            fontSize: parseInt(document.getElementById('fontSize').value) || 16,
            welcomeText: document.getElementById('welcomeText').value,
            confirmationText: document.getElementById('confirmationText').value,
            agbText: document.getElementById('agbText').value,
            privacyText: document.getElementById('privacyText').value,
            logoUrl: document.getElementById('logoUrl').value,
            faviconUrl: document.getElementById('faviconUrl').value,
            backgroundImage: document.getElementById('backgroundImage').value
        };
        
        this.saveSettings();
        this.updateColorPreview();
        this.showSuccessMessage('Design-Einstellungen gespeichert');
    }
    
    saveSystemSettings() {
        this.settings.system = {
            emailSender: document.getElementById('emailSender').value,
            emailFrom: document.getElementById('emailFrom').value,
            smtpHost: document.getElementById('smtpHost').value,
            smtpPort: parseInt(document.getElementById('smtpPort').value) || 587,
            analyticsEnabled: document.getElementById('analyticsEnabled').checked,
            gaId: document.getElementById('gaId').value,
            autoBackup: parseInt(document.getElementById('autoBackup').value) || 7,
            version: this.settings.system?.version || '1.0.0',
            lastUpdate: new Date().toISOString()
        };
        
        this.saveSettings();
        this.showSuccessMessage('System-Einstellungen gespeichert');
    }
    
    saveSettings() {
        localStorage.setItem('adminSettings', JSON.stringify(this.settings));
        this.pendingChanges = false;
    }
    
    // ==================== UI FUNKTIONEN ====================
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Active Klasse setzen
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            }
        });
        
        // Tab Inhalte anzeigen
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
            if (tab.id === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Bei bestimmten Tabs Daten aktualisieren
        if (tabName === 'reservations') {
            this.updateReservationsTable();
        }
        
        if (tabName === 'dashboard') {
            this.updateDashboard();
        }
        
        if (tabName === 'dates') {
            this.renderCalendar();
            this.updateSelectedDatesList();
        }
        
        if (tabName === 'seats') {
            this.updateSeatPreview();
        }
    }
    
    updateUI() {
        // Dashboard Statistiken
        this.updateDashboard();
        
        // Reservierungszähler
        const reservationCount = this.reservations.length;
        document.getElementById('reservationCount').textContent = reservationCount;
        document.getElementById('totalReservations').textContent = reservationCount;
        
        // Systeminfo
        this.updateSystemInfo();
    }
    
    updateDashboard() {
        // Heutige Reservierungen
        const today = this.formatDate(new Date());
        const todayReservations = this.reservations.filter(r => {
            const resDate = r.date ? r.date.split('T')[0] : '';
            return resDate === today;
        }).length;
        
        const todayEl = document.getElementById('todayReservations');
        if (todayEl) todayEl.textContent = todayReservations;
        
        // Belegte Sitze insgesamt
        let occupiedSeats = 0;
        this.reservations.forEach(r => {
            if (r.seats && Array.isArray(r.seats)) {
                occupiedSeats += r.seats.length;
            }
            if (r.groups && Array.isArray(r.groups)) {
                occupiedSeats += r.groups.length;
            }
        });
        
        const occupiedEl = document.getElementById('occupiedSeats');
        if (occupiedEl) occupiedEl.textContent = occupiedSeats;
        
        // Verfügbare Termine berechnen
        this.calculateAvailableDates();
        
        // Umsatz berechnen
        let totalRevenue = 0;
        this.reservations.forEach(r => {
            if (r.total && r.total !== 'Kostenlos') {
                const amount = parseFloat(r.total.replace('€', '').replace(',', '.')) || 0;
                totalRevenue += amount;
            }
        });
        
        const revenueEl = document.getElementById('totalRevenue');
        if (revenueEl) revenueEl.textContent = `€${totalRevenue.toFixed(2)}`;
        
        // Aktive Benutzer (einzigartige Emails)
        const uniqueEmails = new Set(this.reservations.map(r => r.email).filter(email => email));
        const usersEl = document.getElementById('activeUsers');
        if (usersEl) usersEl.textContent = uniqueEmails.size;
        
        // Aktive Events (einzigartige Daten)
        const uniqueDates = new Set(this.reservations.map(r => r.date).filter(date => date));
        const eventsEl = document.getElementById('activeEvents');
        if (eventsEl) eventsEl.textContent = uniqueDates.size;
    }
    
    calculateAvailableDates() {
        if (!this.settings.dates || !this.selectedDates) {
            const datesEl = document.getElementById('availableDates');
            if (datesEl) datesEl.textContent = '0';
            return;
        }
        
        // Verfügbare Termine zählen (nicht blockierte)
        const available = Array.from(this.selectedDates).filter(date => !this.blockedDates.has(date));
        const datesEl = document.getElementById('availableDates');
        if (datesEl) datesEl.textContent = available.length;
    }
    
    showConfirmDialog(title, message, callback) {
        this.confirmCallback = callback;
        document.getElementById('dialogMessage').textContent = message;
        document.querySelector('.dialog-content h3').innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${title}`;
        document.getElementById('confirmDialog').style.display = 'flex';
    }
    
    hideConfirmDialog() {
        document.getElementById('confirmDialog').style.display = 'none';
        this.confirmCallback = null;
    }
    
    showSuccessMessage(message) {
        const successEl = document.getElementById('successMessage');
        if (!successEl) return;
        
        successEl.querySelector('span').textContent = message;
        successEl.style.display = 'flex';
        
        setTimeout(() => {
            successEl.style.display = 'none';
        }, 3000);
    }
    
    // Hilfsfunktionen
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Globale Funktion für Hauptseite
function loadAdminSettings() {
    try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Admin-Einstellungen:', error);
    }
    return null;
}

// Initialisierung
let adminPanel;

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin-panel.html')) {
        adminPanel = new AdminPanel();
        window.adminPanel = adminPanel;
    }
});
