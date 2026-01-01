// Daten und Zustand
let currentDate = new Date();
let selectedDate = null;
let selectedSeats = [];
let selectedGroups = [];

// DOM Elemente
const currentMonthEl = document.getElementById('currentMonth');
const calendarDaysEl = document.getElementById('calendarDays');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const selectedDateEl = document.getElementById('selectedDate');
const seatsSection = document.querySelector('.seats-section');
const seatsGridEl = document.getElementById('seatsGrid');
const summaryDateEl = document.getElementById('summaryDate');
const summarySeatsEl = document.getElementById('summarySeats');
const summaryTotalEl = document.getElementById('summaryTotal');
const nextBtn = document.getElementById('nextBtn');
const stageNameEl = document.getElementById('stageName');
const welcomeTextEl = document.getElementById('welcomeText');
const legendEl = document.getElementById('legend');

// Admin-Einstellungen laden
function loadAdminSettings() {
    try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // CSS Variablen setzen
            if (settings.design) {
                document.documentElement.style.setProperty('--primary-color', settings.design.primaryColor || '#4CAF50');
                document.documentElement.style.setProperty('--secondary-color', settings.design.secondaryColor || '#3498db');
                
                if (settings.design.fontFamily) {
                    document.documentElement.style.setProperty('--font-family', settings.design.fontFamily);
                }
            }
            
            return settings;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Admin-Einstellungen:', error);
    }
    
    // Fallback zu Standard-Einstellungen
    return {
        general: { systemActive: true },
        seats: { mode: 'stage', rows: 8, seatsPerRow: 10 },
        prices: { freeEvent: true },
        design: {}
    };
}

// Kalender initialisieren
function initCalendar() {
    const adminSettings = loadAdminSettings();
    
    // System aktiv?
    if (!adminSettings.general || adminSettings.general.systemActive === false) {
        showSystemDisabled();
        return;
    }
    
    renderCalendar();
    generateSeats();
    updateLegend();
    updateSummary();
    disableSeatSelection();
    
    // Event Listener
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    nextBtn.addEventListener('click', () => {
        if (selectedDate && (selectedSeats.length > 0 || selectedGroups.length > 0)) {
            saveReservationData();
            window.location.href = 'daten.html';
        }
    });
}

function showSystemDisabled() {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <header>
            <h1><i class="fas fa-calendar-alt"></i> Reservierungssystem</h1>
            <p class="subtitle">Das Buchungssystem ist derzeit nicht verfügbar</p>
        </header>
        <main style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-tools" style="font-size: 80px; color: #95a5a6; margin-bottom: 20px;"></i>
            <h2>System vorübergehend deaktiviert</h2>
            <p>Das Reservierungssystem ist derzeit für Wartungsarbeiten nicht verfügbar.</p>
            <p>Bitte versuchen Sie es später erneut.</p>
            <p style="margin-top: 30px; font-size: 0.9rem; color: #7f8c8d;">
                <i class="fas fa-info-circle"></i> Diese Meldung kann im Admin-Panel angepasst werden.
            </p>
        </main>
    `;
}

// Kalender rendern
function renderCalendar() {
    const adminSettings = loadAdminSettings();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthEl.textContent = currentDate.toLocaleDateString('de-DE', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let firstDayIndex = firstDay.getDay();
    if (firstDayIndex === 0) firstDayIndex = 6;
    else firstDayIndex--;
    
    calendarDaysEl.innerHTML = '';
    
    // Leere Tage
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day empty';
        calendarDaysEl.appendChild(emptyDay);
    }
    
    // Tage des Monats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = day;
        dayEl.dataset.date = dateStr;
        
        if (date < today) {
            dayEl.classList.add('past');
            dayEl.title = "Vergangenes Datum";
        } 
        else if (isDateAvailable(dateStr, adminSettings)) {
            dayEl.classList.add('available');
            dayEl.title = "Klicken um Datum auszuwählen";
            dayEl.addEventListener('click', () => selectDate(date, dateStr));
        } else {
            dayEl.classList.add('unavailable');
            dayEl.title = "Nicht verfügbar";
        }
        
        if (selectedDate && dateStr === selectedDate) {
            dayEl.classList.add('selected');
        }
        
        calendarDaysEl.appendChild(dayEl);
    }
}

// Verfügbare Tage prüfen
function isDateAvailable(dateStr, adminSettings) {
    if (!adminSettings.dates) return false;
    
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return false;
    
    // Verfügbare Daten prüfen
    if (adminSettings.dates.availableDates && adminSettings.dates.availableDates.length > 0) {
        if (!adminSettings.dates.availableDates.includes(dateStr)) {
            return false;
        }
    }
    
    // Blockierte Daten prüfen
    if (adminSettings.dates.blockedDates && adminSettings.dates.blockedDates.includes(dateStr)) {
        return false;
    }
    
    // Wochentage prüfen
    if (adminSettings.dates.weekdays && adminSettings.dates.weekdays.length > 0) {
        const dayOfWeek = date.getDay();
        if (!adminSettings.dates.weekdays.includes(dayOfWeek)) {
            return false;
        }
    }
    
    // Buchungszeitraum prüfen
    if (adminSettings.dates.bookingStart) {
        const bookingStart = new Date(adminSettings.dates.bookingStart);
        if (date < bookingStart) return false;
    }
    
    if (adminSettings.dates.bookingEnd) {
        const bookingEnd = new Date(adminSettings.dates.bookingEnd);
        if (date > bookingEnd) return false;
    }
    
    // Max. Vorausbuchung prüfen
    if (adminSettings.dates.maxAdvanceDays) {
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + adminSettings.dates.maxAdvanceDays);
        if (date > maxDate) return false;
    }
    
    return true;
}

// Datum auswählen
function selectDate(date, dateStr) {
    if (selectedDate === dateStr) return;
    
    selectedDate = dateStr;
    selectedSeats = [];
    selectedGroups = [];
    
    selectedDateEl.textContent = date.toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    enableSeatSelection();
    updateSeatsForDate(dateStr);
    updateSummary();
    updateNextButton();
}

// Sitzauswahl deaktivieren
function disableSeatSelection() {
    seatsSection.classList.add('disabled');
    document.querySelectorAll('.seat, .group-slot').forEach(element => {
        element.style.cursor = 'not-allowed';
        element.style.opacity = '0.5';
        if (element.clickHandler) {
            element.removeEventListener('click', element.clickHandler);
        }
    });
}

// Sitzauswahl aktivieren
function enableSeatSelection() {
    seatsSection.classList.remove('disabled');
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    if (mode === 'stage') {
        document.querySelectorAll('.seat:not(.reserved)').forEach(seat => {
            seat.style.cursor = 'pointer';
            seat.style.opacity = '1';
            if (!seat.clickHandler) {
                seat.clickHandler = () => toggleSeat(seat.dataset.seat, seat);
                seat.addEventListener('click', seat.clickHandler);
            }
        });
    } else {
        document.querySelectorAll('.group-slot:not(.reserved)').forEach(slot => {
            slot.style.cursor = 'pointer';
            slot.style.opacity = '1';
            if (!slot.clickHandler) {
                slot.clickHandler = () => toggleGroupSlot(slot.dataset.group, slot.dataset.slot, slot);
                slot.addEventListener('click', slot.clickHandler);
            }
        });
    }
}

// Sitzplan generieren
function generateSeats() {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    seatsGridEl.innerHTML = '';
    
    if (mode === 'stage') {
        generateStageSeats(adminSettings);
    } else {
        generateGroupSeats(adminSettings);
    }
}

function generateStageSeats(adminSettings) {
    const rows = adminSettings.seats.rows || 8;
    const seatsPerRow = adminSettings.seats.seatsPerRow || 10;
    const stageName = adminSettings.seats.stageName || 'BÜHNE';
    const welcomeText = adminSettings.design?.welcomeText || 'Wählen Sie Datum und Sitzplatz';
    
    // Bühnenname setzen
    if (stageNameEl) {
        stageNameEl.textContent = stageName;
    }
    
    // Willkommenstext setzen
    if (welcomeTextEl) {
        welcomeTextEl.textContent = welcomeText;
    }
    
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    
    for (let row = 0; row < rows; row++) {
        for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
            const seatId = `${rowLetters[row]}${seatNum}`;
            const seatEl = document.createElement('div');
            seatEl.className = 'seat available-seat';
            seatEl.textContent = seatId;
            seatEl.dataset.seat = seatId;
            seatEl.dataset.row = rowLetters[row];
            seatEl.dataset.number = seatNum;
            
            seatsGridEl.appendChild(seatEl);
        }
    }
}

function generateGroupSeats(adminSettings) {
    const groupCount = adminSettings.seats.groupCount || 10;
    const slotsPerGroup = adminSettings.seats.slotsPerGroup || 6;
    const groupName = adminSettings.seats.groupName || 'Gruppe';
    
    // Layout anpassen
    seatsGridEl.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
    seatsGridEl.style.gap = '15px';
    
    for (let group = 1; group <= groupCount; group++) {
        const groupEl = document.createElement('div');
        groupEl.className = 'group-container';
        groupEl.style.background = '#f8f9fa';
        groupEl.style.padding = '15px';
        groupEl.style.borderRadius = '10px';
        groupEl.style.border = '2px solid #e1e5e9';
        
        const groupTitle = document.createElement('div');
        groupTitle.className = 'group-title';
        groupTitle.textContent = `${groupName} ${group}`;
        groupTitle.style.fontWeight = 'bold';
        groupTitle.style.marginBottom = '10px';
        groupTitle.style.color = '#2c3e50';
        groupTitle.style.textAlign = 'center';
        
        groupEl.appendChild(groupTitle);
        
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'slots-container';
        slotsContainer.style.display = 'grid';
        slotsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        slotsContainer.style.gap = '8px';
        
        for (let slot = 1; slot <= slotsPerGroup; slot++) {
            const slotEl = document.createElement('div');
            slotEl.className = 'group-slot available-slot';
            slotEl.textContent = slot;
            slotEl.dataset.group = group;
            slotEl.dataset.slot = slot;
            slotEl.style.width = '30px';
            slotEl.style.height = '30px';
            slotEl.style.borderRadius = '5px';
            slotEl.style.background = '#e8f5e9';
            slotEl.style.border = '2px solid #c8e6c9';
            slotEl.style.display = 'flex';
            slotEl.style.alignItems = 'center';
            slotEl.style.justifyContent = 'center';
            slotEl.style.fontSize = '0.9rem';
            slotEl.style.fontWeight = 'bold';
            slotEl.style.color = '#2e7d32';
            slotEl.style.cursor = 'pointer';
            slotEl.style.margin = '0 auto';
            
            slotsContainer.appendChild(slotEl);
        }
        
        groupEl.appendChild(slotsContainer);
        seatsGridEl.appendChild(groupEl);
    }
}

// Sitzplan aktualisieren
function updateSeatsForDate(dateStr) {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    if (mode === 'stage') {
        updateStageSeats(dateStr);
    } else {
        updateGroupSeats(dateStr);
    }
    
    updateSummary();
}

function updateStageSeats(dateStr) {
    const allSeats = document.querySelectorAll('.seat');
    selectedSeats = [];
    
    allSeats.forEach(seat => {
        seat.classList.remove('selected', 'reserved');
        if (seat.clickHandler) {
            seat.removeEventListener('click', seat.clickHandler);
            seat.clickHandler = null;
        }
    });
    
    const reservedSeats = getReservedSeatsForDate(dateStr);
    
    allSeats.forEach(seat => {
        const seatId = seat.dataset.seat;
        
        if (reservedSeats.includes(seatId)) {
            seat.classList.add('reserved');
            seat.classList.remove('available-seat');
        } else {
            seat.classList.remove('reserved');
            seat.classList.add('available-seat');
            seat.clickHandler = () => toggleSeat(seatId, seat);
            seat.addEventListener('click', seat.clickHandler);
        }
    });
}

function updateGroupSeats(dateStr) {
    const allSlots = document.querySelectorAll('.group-slot');
    selectedGroups = [];
    
    allSlots.forEach(slot => {
        slot.classList.remove('selected', 'reserved');
        slot.style.background = '#e8f5e9';
        slot.style.color = '#2e7d32';
        slot.style.borderColor = '#c8e6c9';
        
        if (slot.clickHandler) {
            slot.removeEventListener('click', slot.clickHandler);
            slot.clickHandler = null;
        }
    });
    
    const reservedSlots = getReservedGroupsForDate(dateStr);
    
    allSlots.forEach(slot => {
        const group = slot.dataset.group;
        const slotNum = slot.dataset.slot;
        const slotId = `G${group}-S${slotNum}`;
        
        if (reservedSlots.includes(slotId)) {
            slot.classList.add('reserved');
            slot.classList.remove('available-slot');
        } else {
            slot.classList.remove('reserved');
            slot.classList.add('available-slot');
            slot.clickHandler = () => toggleGroupSlot(group, slotNum, slot);
            slot.addEventListener('click', slot.clickHandler);
        }
    });
}

// Reservierte Sitze/Gruppen abrufen
function getReservedSeatsForDate(dateStr) {
    try {
        const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
        const reservedSeats = [];
        
        reservations.forEach(reservation => {
            if (reservation.date === dateStr && reservation.seats && Array.isArray(reservation.seats)) {
                reservedSeats.push(...reservation.seats);
            }
        });
        
        return reservedSeats;
    } catch (error) {
        console.error('Fehler beim Laden der Reservierungen:', error);
        return [];
    }
}

function getReservedGroupsForDate(dateStr) {
    try {
        const reservations = JSON.parse(localStorage.getItem('reservations')) || [];
        const reservedSlots = [];
        
        reservations.forEach(reservation => {
            if (reservation.date === dateStr && reservation.groups && Array.isArray(reservation.groups)) {
                reservedSlots.push(...reservation.groups);
            }
        });
        
        return reservedSlots;
    } catch (error) {
        console.error('Fehler beim Laden der Reservierungen:', error);
        return [];
    }
}

// Sitz/Gruppe auswählen
function toggleSeat(seatId, seatEl) {
    const adminSettings = loadAdminSettings();
    
    if (!selectedDate) {
        alert('Bitte wählen Sie zuerst ein Datum aus!');
        return;
    }
    
    if (seatEl.classList.contains('reserved')) return;
    
    const index = selectedSeats.indexOf(seatId);
    const maxSeats = adminSettings.seats.maxSeatsPerBooking || 8;
    
    if (index === -1) {
        if (selectedSeats.length >= maxSeats) {
            alert(`Sie können maximal ${maxSeats} Sitze auswählen.`);
            return;
        }
        
        selectedSeats.push(seatId);
        seatEl.classList.add('selected');
    } else {
        selectedSeats.splice(index, 1);
        seatEl.classList.remove('selected');
    }
    
    updateSummary();
    updateNextButton();
}

function toggleGroupSlot(group, slot, slotEl) {
    const adminSettings = loadAdminSettings();
    
    if (!selectedDate) {
        alert('Bitte wählen Sie zuerst ein Datum aus!');
        return;
    }
    
    if (slotEl.classList.contains('reserved')) return;
    
    const slotId = `G${group}-S${slot}`;
    const index = selectedGroups.indexOf(slotId);
    const maxSlots = adminSettings.seats.maxSeatsPerBooking || 8;
    
    if (index === -1) {
        if (selectedGroups.length >= maxSlots) {
            alert(`Sie können maximal ${maxSlots} Slots auswählen.`);
            return;
        }
        
        selectedGroups.push(slotId);
        slotEl.classList.add('selected');
        slotEl.style.background = '#4CAF50';
        slotEl.style.color = 'white';
        slotEl.style.borderColor = '#388e3c';
    } else {
        selectedGroups.splice(index, 1);
        slotEl.classList.remove('selected');
        slotEl.style.background = '#e8f5e9';
        slotEl.style.color = '#2e7d32';
        slotEl.style.borderColor = '#c8e6c9';
    }
    
    updateSummary();
    updateNextButton();
}

// Zusammenfassung aktualisieren
function updateSummary() {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    if (selectedDate) {
        const date = new Date(selectedDate);
        summaryDateEl.textContent = date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } else {
        summaryDateEl.textContent = '-';
    }
    
    if (mode === 'stage') {
        updateStageSummary(adminSettings);
    } else {
        updateGroupSummary(adminSettings);
    }
}

function updateStageSummary(adminSettings) {
    if (selectedSeats.length > 0) {
        summarySeatsEl.textContent = selectedSeats.join(', ');
        
        if (adminSettings.prices && !adminSettings.prices.freeEvent) {
            let total = 0;
            const vipRows = adminSettings.prices.vipRows || 2;
            const vipRowsLetters = ['A', 'B', 'C', 'D'].slice(0, vipRows);
            
            selectedSeats.forEach(seat => {
                const row = seat.charAt(0);
                if (vipRowsLetters.includes(row)) {
                    total += adminSettings.prices.vipPrice || 15;
                } else {
                    total += adminSettings.prices.seatPrice || 10;
                }
            });
            
            // Rabatte anwenden
            if (selectedSeats.length >= 8 && adminSettings.prices.groupDiscount) {
                total = total * (1 - (adminSettings.prices.groupDiscount / 100));
            }
            
            summaryTotalEl.textContent = `€${total.toFixed(2)}`;
        } else {
            summaryTotalEl.textContent = 'Kostenlos';
        }
    } else {
        summarySeatsEl.textContent = 'Keine ausgewählt';
        summaryTotalEl.textContent = adminSettings.prices && !adminSettings.prices.freeEvent ? '€0' : 'Kostenlos';
    }
}

function updateGroupSummary(adminSettings) {
    if (selectedGroups.length > 0) {
        summarySeatsEl.textContent = `${selectedGroups.length} Slots in ${selectedGroups.length} Gruppen`;
        
        if (adminSettings.prices && !adminSettings.prices.freeEvent) {
            let total = 0;
            const slotPrice = adminSettings.prices.slotPrice || 8;
            
            total = selectedGroups.length * slotPrice;
            
            // Mengenrabatt
            if (selectedGroups.length >= (adminSettings.prices.discountGroups || 5)) {
                total = total * 0.9; // 10% Rabatt
            }
            
            summaryTotalEl.textContent = `€${total.toFixed(2)}`;
        } else {
            summaryTotalEl.textContent = 'Kostenlos';
        }
    } else {
        summarySeatsEl.textContent = 'Keine ausgewählt';
        summaryTotalEl.textContent = adminSettings.prices && !adminSettings.prices.freeEvent ? '€0' : 'Kostenlos';
    }
}

// Weiter-Button aktualisieren
function updateNextButton() {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    const minSeats = adminSettings.seats.minSeatsPerBooking || 1;
    
    let hasSelection = false;
    
    if (mode === 'stage') {
        hasSelection = selectedSeats.length >= minSeats;
    } else {
        hasSelection = selectedGroups.length >= minSeats;
    }
    
    if (selectedDate && hasSelection) {
        nextBtn.disabled = false;
        nextBtn.title = "Weiter zu Ihren Daten";
    } else {
        nextBtn.disabled = true;
        nextBtn.title = `Bitte wählen Sie ein Datum und mindestens ${minSeats} ${mode === 'stage' ? 'Sitz' : 'Slot'} aus`;
    }
}

// Legende aktualisieren
function updateLegend() {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    if (mode === 'stage') {
        legendEl.innerHTML = `
            <div class="legend-item">
                <div class="seat-sample available"></div>
                <span>Verfügbar</span>
            </div>
            <div class="legend-item">
                <div class="seat-sample selected"></div>
                <span>Ausgewählt</span>
            </div>
            <div class="legend-item">
                <div class="seat-sample reserved"></div>
                <span>Reserviert</span>
            </div>
        `;
    } else {
        legendEl.innerHTML = `
            <div class="legend-item">
                <div style="width: 25px; height: 25px; background: #e8f5e9; border: 2px solid #c8e6c9; border-radius: 5px;"></div>
                <span>Verfügbar</span>
            </div>
            <div class="legend-item">
                <div style="width: 25px; height: 25px; background: #4CAF50; border: 2px solid #388e3c; border-radius: 5px;"></div>
                <span>Ausgewählt</span>
            </div>
            <div class="legend-item">
                <div style="width: 25px; height: 25px; background: #f5f5f5; border: 2px solid #ddd; border-radius: 5px;"></div>
                <span>Reserviert</span>
            </div>
        `;
    }
}

// Reservierungsdaten speichern - BUG-FIX für Gruppen-Show
function saveReservationData() {
    const adminSettings = loadAdminSettings();
    const mode = adminSettings.seats?.mode || 'stage';
    
    const reservationData = {
        date: selectedDate,
        dateFormatted: selectedDateEl.textContent,
        timestamp: new Date().toISOString(),
        reservationNumber: 'RSV-' + Date.now().toString().slice(-8)
    };
    
    if (mode === 'stage') {
        reservationData.seats = selectedSeats;
        reservationData.type = 'stage';
    } else {
        reservationData.groups = selectedGroups;
        reservationData.type = 'group';
        // Für Kompatibilität mit der Daten-Seite auch seats setzen
        reservationData.seats = selectedGroups;
    }
    
    reservationData.total = summaryTotalEl.textContent;
    
    // In localStorage speichern
    localStorage.setItem('reservation', JSON.stringify(reservationData));
    
    // Sofort weiterleiten (Bug-Fix: keine Verzögerung)
    window.location.href = 'daten.html';
}

// Hilfsfunktionen
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialisierung
document.addEventListener('DOMContentLoaded', initCalendar);
