/**
 * Natural Snacks HR System - Main Application Orchestrator
 * التحكم الرئيسي، التبويبات، المقاولين، الدليل التعليمي، الأرشيف والواجهة
 */

const App = {
    currentTab: 'monthly-sheet',
    currentTourStep: 1,
    totalTourSteps: 4,

    init() {
        Storage.init();
        Attendance.init();
        Custody.init();

        this.setupMonthSelector();
        this.renderAllViews();
        this.setupTrashView();
        this.setupEventListeners();

        // Check first time tour
        setTimeout(() => {
            this.checkFirstTimeTour();
        }, 500);
    },

    setupEventListeners() {
        window.addEventListener('db-updated', () => {
            this.setupMonthSelector();
            this.updateCurrentView();
        });

        // Close modals on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show'));
            }
        });
    },

    // Welcome Onboarding Tour Logic
    checkFirstTimeTour() {
        const seen = localStorage.getItem('NATURAL_SNACKS_TOUR_SEEN');
        if (!seen) {
            this.openTourModal();
        }
    },

    openTourModal() {
        this.currentTourStep = 1;
        this.renderTourStep();
        const modal = document.getElementById('onboardingTourModal');
        if (modal) modal.classList.add('show');
    },

    closeTourModal() {
        localStorage.setItem('NATURAL_SNACKS_TOUR_SEEN', 'true');
        const modal = document.getElementById('onboardingTourModal');
        if (modal) modal.classList.remove('show');
    },

    renderTourStep() {
        for (let i = 1; i <= this.totalTourSteps; i++) {
            const stepEl = document.getElementById(`tourStep${i}`);
            const dotEl = document.getElementById(`tourDot${i}`);
            if (stepEl) {
                if (i === this.currentTourStep) stepEl.classList.add('active');
                else stepEl.classList.remove('active');
            }
            if (dotEl) {
                if (i === this.currentTourStep) dotEl.classList.add('active');
                else dotEl.classList.remove('active');
            }
        }

        const btnPrev = document.getElementById('tourBtnPrev');
        const btnNext = document.getElementById('tourBtnNext');

        if (btnPrev) {
            btnPrev.style.display = this.currentTourStep === 1 ? 'none' : 'inline-flex';
        }
        if (btnNext) {
            if (this.currentTourStep === this.totalTourSteps) {
                btnNext.innerText = '🚀 إنهاء وبدء العمل';
                btnNext.className = 'btn btn-success';
            } else {
                btnNext.innerText = 'التالي ⬅️';
                btnNext.className = 'btn btn-primary';
            }
        }
    },

    nextTourStep() {
        if (this.currentTourStep < this.totalTourSteps) {
            this.currentTourStep++;
            this.renderTourStep();
        } else {
            this.closeTourModal();
            this.showToast('مرحباً بك! يمكنك إعادة فتح دليل الاستخدام في أي وقت من الزر بالأعلى ❓', 'success');
        }
    },

    prevTourStep() {
        if (this.currentTourStep > 1) {
            this.currentTourStep--;
            this.renderTourStep();
        }
    },

    setupMonthSelector() {
        const select = document.getElementById('topbarMonthSelect');
        const months = Storage.getAllMonthsList();
        const active = Storage.getActiveMonthName();

        if (select) {
            select.innerHTML = months.map(m => `<option value="${m}" ${m === active ? 'selected' : ''}>${m}</option>`).join('');
        }

        const activeTitleEl = document.getElementById('activeMonthBadgeTitle');
        if (activeTitleEl) activeTitleEl.innerText = active;
    },

    handleMonthChange(monthName) {
        Storage.setActiveMonth(monthName);
        this.renderAllViews();
        this.showToast(`تم التبديل إلى ${monthName}`, 'info');
    },

    switchTab(tabId) {
        this.currentTab = tabId;

        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        document.querySelectorAll('.tab-view').forEach(view => {
            if (view.id === `view-${tabId}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        this.updateCurrentView();
    },

    updateCurrentView() {
        if (this.currentTab === 'monthly-sheet') {
            Attendance.renderMonthlySheetTable();
        } else if (this.currentTab === 'daily-attendance') {
            Attendance.renderDailyView();
        } else if (this.currentTab === 'custody') {
            Custody.render();
        } else if (this.currentTab === 'dashboard') {
            Attendance.updateDashboardStats();
            Custody.renderStats();
        } else if (this.currentTab === 'workers-directory') {
            this.renderWorkersDirectory();
        } else if (this.currentTab === 'archive') {
            this.renderArchiveView();
        } else if (this.currentTab === 'backup-trash') {
            this.setupTrashView();
        }
    },

    renderAllViews() {
        Attendance.renderMonthlySheetTable();
        Attendance.renderDailyView();
        Custody.render();
        this.renderWorkersDirectory();
        this.renderArchiveView();
        this.setupTrashView();
    },

    // Workers & Contractors Directory View
    renderWorkersDirectory() {
        // 1. Render Contractors Cards / Table
        const contractorsContainer = document.getElementById('contractorsDirectoryList');
        if (contractorsContainer) {
            const contractors = Storage.getContractorsList();
            const monthData = Storage.getActiveMonthData();
            const records = monthData.records || [];

            let cHtml = '';
            contractors.forEach(c => {
                const count = records.filter(r => r.contractor === c).length;
                cHtml += `
                    <div class="panel" style="margin-bottom:12px; border:1px solid #e2e8f0;">
                        <div class="panel-body" style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                            <div>
                                <strong style="font-size:1.05rem; color:#1e293b;">🏢 ${c}</strong>
                                <span class="badge badge-secondary" style="margin-right:8px;">${count} عامل / عربية مسجلين</span>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="btn btn-sm btn-primary" onclick="Attendance.openAddWorkerModal('${c}')">+ إضافة عامل هنا</button>
                                ${c !== 'عمالة مباشرة' ? `
                                    <button class="btn btn-sm btn-secondary" onclick="App.openRenameContractorModal('${c}')">✏️ تعديل الاسم</button>
                                    <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteContractor('${c}')">🗑️ حذف المقاول</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            contractorsContainer.innerHTML = cHtml;
        }

        // 2. Render Workers Table
        const tbody = document.getElementById('workersDirectoryTableBody');
        if (!tbody) return;

        const monthData = Storage.getActiveMonthData();
        const records = monthData.records || [];

        let html = '';
        records.forEach((rec, idx) => {
            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td style="font-weight:700; text-align:right;">${rec.isVehicle ? '🚗 ' : '👤 '}${rec.name}</td>
                    <td>${rec.nationalId || '-'}</td>
                    <td><span class="badge badge-secondary">${rec.contractor}</span></td>
                    <td>${rec.isVehicle ? 'سيارة / مقاول' : 'عامل يومية'}</td>
                    <td>${rec.workerRate} ج.م</td>
                    <td>${rec.contractorRate || 0} ج.م</td>
                    <td>
                        <div style="display:flex; gap:6px; justify-content:center;">
                            <button class="btn btn-sm btn-secondary" onclick="Attendance.openEditWorkerModal(${idx})">تعديل</button>
                            <button class="btn btn-sm btn-danger" onclick="Attendance.confirmDeleteWorker(${idx})">حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || `<tr><td colspan="8" style="text-align:center; padding:20px; color:#94a3b8;">لا يوجد عمال مسجلين في هذا الشهر</td></tr>`;
    },

    // Contractors Management Modals
    openAddContractorModal() {
        document.getElementById('modalNewContractorName').value = '';
        document.getElementById('addContractorModal').classList.add('show');
    },

    saveNewContractor() {
        const name = document.getElementById('modalNewContractorName').value.trim();
        if (!name) {
            alert('يرجى إدخال اسم المقاول أو السيارة!');
            return;
        }

        const res = Storage.addContractor(name);
        document.getElementById('addContractorModal').classList.remove('show');
        this.renderAllViews();
        this.showToast(res.message, 'success');
    },

    openRenameContractorModal(oldName) {
        document.getElementById('modalOldContractorName').value = oldName;
        document.getElementById('modalRenameContractorInput').value = oldName;
        document.getElementById('renameContractorModal').classList.add('show');
    },

    saveRenameContractor() {
        const oldName = document.getElementById('modalOldContractorName').value;
        const newName = document.getElementById('modalRenameContractorInput').value.trim();
        if (!newName) return;

        const res = Storage.renameContractor(oldName, newName);
        document.getElementById('renameContractorModal').classList.remove('show');
        this.renderAllViews();
        this.showToast(res.message, 'success');
    },

    confirmDeleteContractor(contractorName) {
        if (confirm(`هل أنت متأكد من حذف المقاول (${contractorName})؟\n(ملاحظة: سيتم تحويل أي عمال تابعين له إلى عمالة مباشرة)`)) {
            const res = Storage.deleteContractor(contractorName);
            this.renderAllViews();
            this.showToast(res.message, 'info');
        }
    },

    // Monthly Archive View
    renderArchiveView() {
        const container = document.getElementById('archiveMonthsGrid');
        if (!container) return;

        const months = Storage.getAllMonthsList();
        const active = Storage.getActiveMonthName();

        let html = '';
        months.forEach(m => {
            const mData = Storage.data.months[m] || { records: [] };
            const count = mData.records.length;
            const isActive = m === active;

            let monthPayroll = 0;
            let monthShifts = 0;
            mData.records.forEach(r => {
                const calc = Attendance.calculateRow(r);
                monthPayroll += calc.netWorkerDue + (r.isVehicle ? calc.contractorDue : 0);
                monthShifts += calc.totalShifts;
            });

            html += `
                <div class="panel" style="border: ${isActive ? '2px solid #059669' : '1px solid #e2e8f0'}; position:relative; box-shadow: ${isActive ? '0 4px 12px rgba(5,150,105,0.15)' : 'var(--shadow-sm)'};">
                    ${isActive ? `<span style="position:absolute; top:12px; left:12px; background:#059669; color:#fff; font-size:0.75rem; font-weight:700; padding:3px 10px; border-radius:999px;">الشهر المفتوح حالياً</span>` : ''}
                    <div class="panel-body">
                        <div style="font-size:1.25rem; font-weight:800; color:#1e293b; margin-bottom:8px;">📁 ${m}</div>
                        <div style="font-size:0.85rem; color:#64748b; margin-bottom:12px; line-height:1.6;">
                            <div>👥 إجمالي السجلات: <strong>${count} عامل وسيارات</strong></div>
                            <div>⚡ إجمالي الورديات: <strong>${Math.round(monthShifts * 10) / 10}</strong></div>
                            <div>💵 صافي الرواتب: <strong style="color:#059669;">${monthPayroll.toLocaleString('ar-EG')} ج.م</strong></div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; padding-top:10px; border-top:1px solid #f1f5f9;">
                            <button class="btn btn-sm btn-primary" onclick="App.handleMonthChange('${m}'); App.switchTab('monthly-sheet');">📖 فتح وتعديل الكشف</button>
                            <button class="btn btn-sm btn-success" onclick="Storage.setActiveMonth('${m}'); Exporter.exportToExcel();">📥 إكسيل ملون</button>
                            ${!isActive ? `<button class="btn btn-sm btn-danger" onclick="App.confirmDeleteMonth('${m}')">🗑️ حذف</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    openCreateMonthModal() {
        const d = new Date();
        const nextMonth = d.getMonth() + 2 > 12 ? 1 : d.getMonth() + 2;
        const nextYear = d.getMonth() + 2 > 12 ? d.getFullYear() + 1 : d.getFullYear();
        document.getElementById('modalNewMonthName').value = `شهر ${nextMonth}-${nextYear}`;
        document.getElementById('createMonthModal').classList.add('show');
    },

    saveNewMonth() {
        const name = document.getElementById('modalNewMonthName').value.trim();
        const copyEmployees = document.getElementById('modalCopyEmployeesCheck').checked;

        if (!name) {
            alert('يرجى إدخال اسم الشهر!');
            return;
        }

        const res = Storage.createMonth(name, copyEmployees);
        if (res.success) {
            document.getElementById('createMonthModal').classList.remove('show');
            this.setupMonthSelector();
            this.renderAllViews();
            this.showToast(res.message, 'success');
        } else {
            alert(res.message);
        }
    },

    confirmDeleteMonth(m) {
        if (confirm(`هل أنت متأكد من حذف كشف (${m})؟\n(ملاحظة: سيتم نقله إلى سلة المهملات ويمكن استرجاعه)`)) {
            Storage.deleteMonth(m);
            this.setupMonthSelector();
            this.renderAllViews();
            this.showToast(`تم نقل ${m} إلى سلة المهملات`, 'info');
        }
    },

    // Trash & Recycle Bin
    setupTrashView() {
        const tbody = document.getElementById('trashTableBody');
        if (!tbody) return;

        const trash = Storage.trash || [];
        if (trash.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8;">سلة المهملات فارغة ✅</td></tr>`;
            return;
        }

        let html = '';
        trash.forEach(t => {
            let label = '';
            if (t.type === 'month') label = `كشف شهر كامل: ${t.data.monthName}`;
            else if (t.type === 'worker_record') label = `عامل: ${t.data.record.name} (${t.data.monthName})`;
            else if (t.type === 'expense') label = `مصروف: ${t.data.expense.item} (${t.data.expense.price} ج)`;
            else if (t.type === 'deposit') label = `إيداع عهدة: (${t.data.deposit.amount} ج)`;

            html += `
                <tr>
                    <td><span class="badge badge-accent">${t.type}</span></td>
                    <td style="font-weight:700; text-align:right;">${label}</td>
                    <td style="font-size:0.8rem; color:#64748b;">${t.deletedAt}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="App.restoreTrashItem('${t.id}')">🔄 استرجاع</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    restoreTrashItem(id) {
        if (Storage.restoreFromTrash(id)) {
            this.renderAllViews();
            this.showToast('تم استرجاع العنصر المحذوف بنجاح!', 'success');
        }
    },

    emptyTrash() {
        if (confirm('هل أنت متأكد من تفريغ سلة المهملات نهائياً؟')) {
            Storage.emptyTrash();
            this.setupTrashView();
            this.showToast('تم تفريغ سلة المهملات', 'info');
        }
    },

    // Backup & Restore
    handleBackupDownload() {
        Storage.exportBackupJSON();
        this.showToast('تم حفظ وتنزيل ملف النسخة الاحتياطية بنجاح!', 'success');
    },

    handleBackupUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const res = Storage.importBackupJSON(content);
            if (res.success) {
                this.setupMonthSelector();
                this.renderAllViews();
                this.showToast(res.message, 'success');
            } else {
                alert(res.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'danger') icon = '❌';
        else if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => App.init());
