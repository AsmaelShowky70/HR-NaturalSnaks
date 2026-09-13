/**
 * Natural Snacks HR System - Attendance & Payroll Calculation Module
 * موديول الحضور، الورديات، كشف الرواتب وحسابات المقاولين
 */

const Attendance = {
    selectedDay: 1,
    filterContractor: 'all',
    searchQuery: '',

    init() {
        this.selectedDay = new Date().getDate();
        if (this.selectedDay > 31) this.selectedDay = 1;
    },

    getDaysInMonth(monthName) {
        const m = monthName || Storage.getActiveMonthName();
        const match = m.match(/(\d+)-(\d+)/);
        if (match) {
            const monthNum = parseInt(match[1]);
            const yearNum = parseInt(match[2]);
            return new Date(yearNum, monthNum, 0).getDate();
        }
        return 31;
    },

    getGroupedRecords() {
        const monthData = Storage.getActiveMonthData();
        const records = monthData.records || [];
        const groups = {};

        records.forEach((rec, originalIndex) => {
            const contractor = (rec.contractor || 'عمالة مباشرة').trim();
            if (!groups[contractor]) {
                groups[contractor] = [];
            }
            groups[contractor].push({ ...rec, originalIndex });
        });

        return groups;
    },

    calculateRow(rec) {
        const attendance = rec.attendance || {};
        let totalShifts = 0;
        for (const day in attendance) {
            totalShifts += (parseFloat(attendance[day]) || 0);
        }

        const workerRate = parseFloat(rec.workerRate) || 0;
        const contractorRate = parseFloat(rec.contractorRate) || 0;
        const loans = parseFloat(rec.loans) || 0;
        const penalties = parseFloat(rec.penalties) || 0;
        const paid = parseFloat(rec.paid) || 0;

        const totalGross = totalShifts * workerRate;
        const netWorkerDue = Math.max(0, totalGross - loans - penalties);
        const contractorDue = totalShifts * contractorRate;
        const remaining = (rec.isVehicle ? (contractorDue - loans - penalties) : netWorkerDue) - paid;

        return {
            totalShifts: Math.round(totalShifts * 10) / 10,
            workerRate,
            totalGross,
            loans,
            penalties,
            netWorkerDue,
            contractorRate,
            contractorDue,
            paid,
            remaining
        };
    },

    renderMonthlySheetTable() {
        const container = document.getElementById('monthlySheetTableContainer');
        if (!container) return;

        const monthName = Storage.getActiveMonthName();
        const daysCount = this.getDaysInMonth(monthName);
        const grouped = this.getGroupedRecords();

        let dayHeaders = '';
        for (let d = 1; d <= daysCount; d++) {
            dayHeaders += `<th class="day-col">${d}</th>`;
        }

        let html = `
        <table class="data-table" id="mainPayrollTable">
            <thead>
                <tr>
                    <th class="sticky-col-1">م</th>
                    <th class="sticky-col-2">اسم العامل / العربية</th>
                    <th class="sticky-col-3">المقاول / التبعية</th>
                    ${dayHeaders}
                    <th style="background:#e0f2fe; color:#0369a1;">إجمالي الورديات</th>
                    <th>سعر الوردية</th>
                    <th>المستحق قبل السلف</th>
                    <th style="color:#b91c1c;">سلف</th>
                    <th style="color:#dc2626;">جزاءات</th>
                    <th style="background:#dcfce7; color:#15803d; font-weight:800;">صافي المستحق</th>
                    <th>سعر المقاول</th>
                    <th>مستحق المقاول</th>
                    <th>المدفوع</th>
                    <th style="background:#fef3c7; color:#b45309; font-weight:800;">المتبقي</th>
                    <th class="no-print">إجراءات</th>
                </tr>
            </thead>
            <tbody>
        `;

        let overallTotalShifts = 0;
        let overallGross = 0;
        let overallLoans = 0;
        let overallPenalties = 0;
        let overallNetWorker = 0;
        let overallContractorDue = 0;
        let overallPaid = 0;
        let overallRemaining = 0;

        let globalCounter = 1;

        for (const contractorName in grouped) {
            const list = grouped[contractorName];

            html += `
                <tr class="contractor-header-row">
                    <td colspan="${daysCount + 14}">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>🏢 مجموعة: ${contractorName} (${list.length} سجل)</span>
                            <span class="no-print" style="display:flex; gap:6px;">
                                <button class="btn btn-sm btn-outline-primary" style="color:#fff; border-color:rgba(255,255,255,0.4);" onclick="Attendance.openAddWorkerModal('${contractorName}')">+ إضافة عامل في هذه المجموعة</button>
                                ${contractorName !== 'عمالة مباشرة' ? `<button class="btn btn-sm btn-secondary" style="font-size:0.75rem; padding:2px 8px;" onclick="App.openRenameContractorModal('${contractorName}')">✏️ تعديل اسم المقاول</button>` : ''}
                            </span>
                        </div>
                    </td>
                </tr>
            `;

            let subShifts = 0;
            let subGross = 0;
            let subLoans = 0;
            let subPenalties = 0;
            let subNetWorker = 0;
            let subContractorDue = 0;
            let subPaid = 0;
            let subRemaining = 0;

            list.forEach(rec => {
                const calc = Attendance.calculateRow(rec);

                subShifts += calc.totalShifts;
                subGross += calc.totalGross;
                subLoans += calc.loans;
                subPenalties += calc.penalties;
                subNetWorker += calc.netWorkerDue;
                subContractorDue += calc.contractorDue;
                subPaid += calc.paid;
                subRemaining += calc.remaining;

                let dayCells = '';
                for (let d = 1; d <= daysCount; d++) {
                    const val = (rec.attendance && rec.attendance[d] !== undefined) ? rec.attendance[d] : '';
                    const valClass = val == 1 ? 'val-1' : val == 2 ? 'val-2' : val == 3 ? 'val-3' : val === 0 ? 'val-0' : '';

                    dayCells += `
                        <td class="day-col" style="padding:2px;">
                            <input type="text" 
                                   class="shift-input ${valClass}" 
                                   value="${val}" 
                                   data-idx="${rec.originalIndex}" 
                                   data-day="${d}"
                                   placeholder="-"
                                   onfocus="this.select()"
                                   onchange="Attendance.handleShiftCellChange(this)"
                                   onkeydown="Attendance.handleCellKeyNav(event, this)"
                            />
                        </td>
                    `;
                }

                html += `
                    <tr id="row_${rec.originalIndex}" style="${rec.isVehicle ? 'background:#fdf4ff; font-weight:600;' : ''}">
                        <td class="sticky-col-1">${globalCounter++}</td>
                        <td class="sticky-col-2">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span>${rec.isVehicle ? '🚗 ' : '👤 '}</span>
                                <span style="font-weight:700;">${rec.name}</span>
                            </div>
                            ${rec.nationalId ? `<small style="color:#64748b; font-size:0.7rem;">${rec.nationalId}</small>` : ''}
                        </td>
                        <td class="sticky-col-3"><span class="badge badge-secondary">${rec.contractor}</span></td>
                        ${dayCells}
                        <td style="background:#f0f9ff; font-weight:700; color:#0369a1;">${calc.totalShifts}</td>
                        <td>
                            <input type="number" style="width:60px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:2px;"
                                   value="${rec.workerRate}" onchange="Attendance.handleFieldChange(${rec.originalIndex}, 'workerRate', this.value)"/>
                        </td>
                        <td style="font-weight:600;">${calc.totalGross.toLocaleString('ar-EG')}</td>
                        <td>
                            <input type="number" style="width:60px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:2px; color:#b91c1c;"
                                   value="${rec.loans || 0}" onchange="Attendance.handleFieldChange(${rec.originalIndex}, 'loans', this.value)"/>
                        </td>
                        <td>
                            <input type="number" style="width:60px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:2px; color:#dc2626;"
                                   value="${rec.penalties || 0}" onchange="Attendance.handleFieldChange(${rec.originalIndex}, 'penalties', this.value)"/>
                        </td>
                        <td style="background:#ecfdf5; color:#065f46; font-weight:800; font-size:0.95rem;">${calc.netWorkerDue.toLocaleString('ar-EG')}</td>
                        <td>
                            <input type="number" style="width:60px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:2px;"
                                   value="${rec.contractorRate || 0}" onchange="Attendance.handleFieldChange(${rec.originalIndex}, 'contractorRate', this.value)"/>
                        </td>
                        <td style="font-weight:600;">${calc.contractorDue.toLocaleString('ar-EG')}</td>
                        <td>
                            <input type="number" style="width:60px; text-align:center; border:1px solid #cbd5e1; border-radius:4px; padding:2px;"
                                   value="${rec.paid || 0}" onchange="Attendance.handleFieldChange(${rec.originalIndex}, 'paid', this.value)"/>
                        </td>
                        <td style="background:#fffbeb; color:#92400e; font-weight:800;">${calc.remaining.toLocaleString('ar-EG')}</td>
                        <td class="no-print">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                <button class="btn btn-sm btn-secondary btn-icon-only" title="تعديل بيانات العامل والمقاول" onclick="Attendance.openEditWorkerModal(${rec.originalIndex})">✏️</button>
                                <button class="btn btn-sm btn-danger btn-icon-only" title="حذف العامل" onclick="Attendance.confirmDeleteWorker(${rec.originalIndex})">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            // Subtotal
            html += `
                <tr class="contractor-total-row">
                    <td colspan="3" style="text-align:right;">إجمالي ${contractorName}</td>
                    <td colspan="${daysCount}" style="color:#64748b; font-size:0.75rem;">---</td>
                    <td style="background:#e0f2fe; color:#0369a1;">${Math.round(subShifts * 10) / 10}</td>
                    <td>-</td>
                    <td>${subGross.toLocaleString('ar-EG')}</td>
                    <td style="color:#b91c1c;">${subLoans.toLocaleString('ar-EG')}</td>
                    <td style="color:#dc2626;">${subPenalties.toLocaleString('ar-EG')}</td>
                    <td style="background:#dcfce7; color:#15803d; font-weight:800;">${subNetWorker.toLocaleString('ar-EG')}</td>
                    <td>-</td>
                    <td>${subContractorDue.toLocaleString('ar-EG')}</td>
                    <td>${subPaid.toLocaleString('ar-EG')}</td>
                    <td style="background:#fef3c7; color:#b45309; font-weight:800;">${subRemaining.toLocaleString('ar-EG')}</td>
                    <td class="no-print">-</td>
                </tr>
            `;

            overallTotalShifts += subShifts;
            overallGross += subGross;
            overallLoans += subLoans;
            overallPenalties += subPenalties;
            overallNetWorker += subNetWorker;
            overallContractorDue += subContractorDue;
            overallPaid += subPaid;
            overallRemaining += subRemaining;
        }

        // Grand Total
        html += `
            <tr class="grand-total-row">
                <td colspan="3" style="text-align:right; font-size:1rem;">⭐ الإجمالي العام لكافة العمال والمقاولين</td>
                <td colspan="${daysCount}" style="color:#047857; font-size:0.8rem;">ناتشورال سناكس</td>
                <td style="background:#bae6fd; color:#0284c7; font-size:1.05rem;">${Math.round(overallTotalShifts * 10) / 10}</td>
                <td>-</td>
                <td>${overallGross.toLocaleString('ar-EG')}</td>
                <td style="color:#991b1b;">${overallLoans.toLocaleString('ar-EG')}</td>
                <td style="color:#991b1b;">${overallPenalties.toLocaleString('ar-EG')}</td>
                <td style="background:#bbf7d0; color:#14532d; font-size:1.1rem;">${overallNetWorker.toLocaleString('ar-EG')} ج.م</td>
                <td>-</td>
                <td>${overallContractorDue.toLocaleString('ar-EG')} ج.م</td>
                <td>${overallPaid.toLocaleString('ar-EG')} ج.م</td>
                <td style="background:#fde68a; color:#78350f; font-size:1.1rem;">${overallRemaining.toLocaleString('ar-EG')} ج.م</td>
                <td class="no-print">-</td>
            </tr>
            </tbody>
        </table>
        `;

        container.innerHTML = html;
        this.updateDashboardStats();
    },

    handleShiftCellChange(input) {
        const idx = parseInt(input.getAttribute('data-idx'));
        const day = parseInt(input.getAttribute('data-day'));
        let val = input.value.trim();

        if (val === '' || val === '0' || val === '-') {
            val = 0;
            input.value = '';
            input.className = 'shift-input val-0';
        } else {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                val = num;
                input.value = num;
                input.className = `shift-input val-${num == 1 ? '1' : num == 2 ? '2' : num == 3 ? '3' : 'custom'}`;
            } else {
                val = 0;
                input.value = '';
            }
        }

        Storage.updateAttendance(idx, day, val);
        this.renderMonthlySheetTable();
    },

    handleCellKeyNav(e, currentInput) {
        const idx = parseInt(currentInput.getAttribute('data-idx'));
        const day = parseInt(currentInput.getAttribute('data-day'));

        if (e.key === 'ArrowRight') {
            const next = document.querySelector(`.shift-input[data-idx="${idx}"][data-day="${day - 1}"]`);
            if (next) { next.focus(); e.preventDefault(); }
        } else if (e.key === 'ArrowLeft') {
            const next = document.querySelector(`.shift-input[data-idx="${idx}"][data-day="${day + 1}"]`);
            if (next) { next.focus(); e.preventDefault(); }
        } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
            const next = document.querySelector(`.shift-input[data-idx="${idx + 1}"][data-day="${day}"]`);
            if (next) { next.focus(); e.preventDefault(); }
        } else if (e.key === 'ArrowUp') {
            const next = document.querySelector(`.shift-input[data-idx="${idx - 1}"][data-day="${day}"]`);
            if (next) { next.focus(); e.preventDefault(); }
        }
    },

    handleFieldChange(empIndex, field, value) {
        Storage.updateEmployeeField(empIndex, field, value);
        this.renderMonthlySheetTable();
    },

    renderDailyView() {
        const monthName = Storage.getActiveMonthName();
        const daysCount = this.getDaysInMonth(monthName);
        const dayGrid = document.getElementById('dailyDaysGrid');
        if (dayGrid) {
            let gridHtml = '';
            for (let d = 1; d <= daysCount; d++) {
                const isActive = d === this.selectedDay;
                gridHtml += `
                    <button class="day-badge-btn ${isActive ? 'active' : ''}" onclick="Attendance.selectDailyDay(${d})">
                        ${d}
                    </button>
                `;
            }
            dayGrid.innerHTML = gridHtml;
        }

        // Dynamically populate contractor filter
        const filterSelect = document.getElementById('dailyContractorFilter');
        if (filterSelect) {
            const contractors = Storage.getContractorsList();
            let optHtml = `<option value="all">جميع المجموعات والمقاولين</option>`;
            contractors.forEach(c => {
                optHtml += `<option value="${c}" ${this.filterContractor === c ? 'selected' : ''}>${c}</option>`;
            });
            filterSelect.innerHTML = optHtml;
        }

        const container = document.getElementById('dailyWorkersListContainer');
        if (!container) return;

        const monthData = Storage.getActiveMonthData();
        const records = monthData.records || [];

        let filtered = records.map((rec, originalIndex) => ({ ...rec, originalIndex }));

        if (this.filterContractor !== 'all') {
            filtered = filtered.filter(r => r.contractor === this.filterContractor);
        }

        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.trim().toLowerCase();
            filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || (r.contractor && r.contractor.toLowerCase().includes(q)));
        }

        let dayTotalShifts = 0;
        let dayPresentCount = 0;

        let listHtml = '';
        filtered.forEach(rec => {
            const currentShift = (rec.attendance && rec.attendance[this.selectedDay] !== undefined) ? rec.attendance[this.selectedDay] : 0;
            if (currentShift > 0) {
                dayPresentCount++;
                dayTotalShifts += currentShift;
            }

            listHtml += `
                <div class="worker-quick-card">
                    <div class="worker-quick-info">
                        <div class="worker-quick-name">${rec.isVehicle ? '🚗 ' : '👤 '}${rec.name}</div>
                        <div class="worker-quick-meta">
                            <span class="badge badge-secondary">${rec.contractor}</span>
                            <span>يومية: ${rec.workerRate} ج</span>
                        </div>
                    </div>
                    <div class="shift-buttons-group">
                        <button class="btn-shift-select ${currentShift == 0 ? 'active-0' : ''}" title="غياب (0)" onclick="Attendance.setQuickShift(${rec.originalIndex}, 0)">غائب</button>
                        <button class="btn-shift-select ${currentShift == 1 ? 'active-1' : ''}" title="وردية واحدة (1)" onclick="Attendance.setQuickShift(${rec.originalIndex}, 1)">1</button>
                        <button class="btn-shift-select ${currentShift == 2 ? 'active-2' : ''}" title="ورديتان (2)" onclick="Attendance.setQuickShift(${rec.originalIndex}, 2)">2</button>
                        <button class="btn-shift-select ${currentShift == 3 ? 'active-3' : ''}" title="3 ورديات (3)" onclick="Attendance.setQuickShift(${rec.originalIndex}, 3)">3</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = listHtml || '<div style="text-align:center; padding:30px; color:#94a3b8;">لا توجد عمالة مطابقة للبحث</div>';

        const dayPresentEl = document.getElementById('dailyPresentCount');
        const dayShiftsEl = document.getElementById('dailyTotalShifts');
        const dayDateTitle = document.getElementById('dailySelectedDateTitle');

        if (dayPresentEl) dayPresentEl.innerText = dayPresentCount;
        if (dayShiftsEl) dayShiftsEl.innerText = dayTotalShifts;
        if (dayDateTitle) dayDateTitle.innerText = `يوم ${this.selectedDay} - ${monthName}`;
    },

    selectDailyDay(day) {
        this.selectedDay = day;
        this.renderDailyView();
    },

    setQuickShift(empIndex, shift) {
        Storage.updateAttendance(empIndex, this.selectedDay, shift);
        this.renderDailyView();
        App.showToast(`تم تسجيل وردية (${shift}) للعامل بنجاح`, 'success');
    },

    setAllQuickShift(shift) {
        const monthData = Storage.getActiveMonthData();
        const records = monthData.records || [];
        records.forEach((rec, idx) => {
            if (this.filterContractor === 'all' || rec.contractor === this.filterContractor) {
                Storage.updateAttendance(idx, this.selectedDay, shift);
            }
        });
        this.renderDailyView();
        App.showToast(`تم تعيين (${shift}) وردية للجميع في يوم ${this.selectedDay}`, 'success');
    },

    updateDashboardStats() {
        const monthData = Storage.getActiveMonthData();
        const records = monthData.records || [];

        let totalWorkers = records.filter(r => !r.isVehicle).length;
        let totalVehicles = records.filter(r => r.isVehicle).length;
        let totalShifts = 0;
        let totalNetPayroll = 0;

        records.forEach(rec => {
            const calc = this.calculateRow(rec);
            totalShifts += calc.totalShifts;
            totalNetPayroll += calc.netWorkerDue + (rec.isVehicle ? calc.contractorDue : 0);
        });

        const custodyStats = Storage.getCustodyStats();

        const elWorkers = document.getElementById('dashTotalWorkers');
        const elShifts = document.getElementById('dashTotalShifts');
        const elPayroll = document.getElementById('dashTotalPayroll');
        const elCustody = document.getElementById('dashCustodyBalance');

        if (elWorkers) elWorkers.innerText = `${totalWorkers} عامل (+${totalVehicles} عربية)`;
        if (elShifts) elShifts.innerText = Math.round(totalShifts * 10) / 10;
        if (elPayroll) elPayroll.innerText = totalNetPayroll.toLocaleString('ar-EG') + ' ج.م';
        if (elCustody) elCustody.innerText = custodyStats.balance.toLocaleString('ar-EG') + ' ج.م';
    },

    openAddWorkerModal(contractorDefault = '') {
        const modal = document.getElementById('addWorkerModal');
        const selectContractor = document.getElementById('modalWorkerContractor');
        
        const contractors = Storage.getContractorsList();
        let optHtml = contractors.map(c => `<option value="${c}" ${c === contractorDefault ? 'selected' : ''}>${c}</option>`).join('');
        optHtml += `<option value="__NEW__" style="font-weight:bold; color:#059669;">+ [ إضافة مقاول جديد... ]</option>`;
        selectContractor.innerHTML = optHtml;

        document.getElementById('modalWorkerName').value = '';
        document.getElementById('modalWorkerNationalId').value = '';
        document.getElementById('modalWorkerRate').value = '200';
        document.getElementById('modalContractorRate').value = '0';
        document.getElementById('modalIsVehicle').checked = false;

        const customContractorInput = document.getElementById('modalCustomContractorInput');
        if (customContractorInput) {
            customContractorInput.value = '';
            customContractorInput.style.display = 'none';
        }

        modal.classList.add('show');
    },

    handleContractorSelectChange(selectEl, customInputId) {
        const customInput = document.getElementById(customInputId);
        if (customInput) {
            if (selectEl.value === '__NEW__') {
                customInput.style.display = 'block';
                customInput.focus();
            } else {
                customInput.style.display = 'none';
            }
        }
    },

    saveNewWorker() {
        const name = document.getElementById('modalWorkerName').value.trim();
        if (!name) {
            alert('يرجى إدخال اسم العامل أو المقاول!');
            return;
        }

        const nationalId = document.getElementById('modalWorkerNationalId').value.trim();
        const selectContractor = document.getElementById('modalWorkerContractor').value;
        const customContractor = (document.getElementById('modalCustomContractorInput') ? document.getElementById('modalCustomContractorInput').value.trim() : '');

        let contractor = selectContractor === '__NEW__' ? customContractor : selectContractor;
        if (!contractor) contractor = 'عمالة مباشرة';

        const workerRate = parseFloat(document.getElementById('modalWorkerRate').value) || 200;
        const contractorRate = parseFloat(document.getElementById('modalContractorRate').value) || 0;
        const isVehicle = document.getElementById('modalIsVehicle').checked;

        Storage.addWorkerToActiveMonth({
            name,
            nationalId,
            contractor,
            workerRate: isVehicle ? 0 : workerRate,
            contractorRate,
            isVehicle
        });

        document.getElementById('addWorkerModal').classList.remove('show');
        this.renderMonthlySheetTable();
        this.renderDailyView();
        App.renderWorkersDirectory();
        App.showToast(`تمت إضافة (${name}) للمجموعة (${contractor}) بنجاح`, 'success');
    },

    openEditWorkerModal(idx) {
        const monthData = Storage.getActiveMonthData();
        const rec = monthData.records[idx];
        if (!rec) return;

        document.getElementById('editWorkerIdx').value = idx;
        document.getElementById('editWorkerName').value = rec.name;
        document.getElementById('editWorkerNationalId').value = rec.nationalId || '';
        document.getElementById('editWorkerRate').value = rec.workerRate;
        document.getElementById('editContractorRate').value = rec.contractorRate || 0;
        document.getElementById('editWorkerLoans').value = rec.loans || 0;
        document.getElementById('editWorkerPenalties').value = rec.penalties || 0;

        const selectContractor = document.getElementById('editWorkerContractor');
        const contractors = Storage.getContractorsList();
        let optHtml = contractors.map(c => `<option value="${c}" ${c === rec.contractor ? 'selected' : ''}>${c}</option>`).join('');
        optHtml += `<option value="__NEW__" style="font-weight:bold; color:#059669;">+ [ كتابة اسم مقاول جديد... ]</option>`;
        selectContractor.innerHTML = optHtml;

        const customInput = document.getElementById('editCustomContractorInput');
        if (customInput) {
            customInput.value = '';
            customInput.style.display = 'none';
        }

        document.getElementById('editWorkerModal').classList.add('show');
    },

    saveEditedWorker() {
        const idx = parseInt(document.getElementById('editWorkerIdx').value);
        const name = document.getElementById('editWorkerName').value.trim();
        if (!name) return;

        const selectContractor = document.getElementById('editWorkerContractor').value;
        const customContractor = (document.getElementById('editCustomContractorInput') ? document.getElementById('editCustomContractorInput').value.trim() : '');
        let contractor = selectContractor === '__NEW__' ? customContractor : selectContractor;
        if (!contractor) contractor = 'عمالة مباشرة';

        Storage.updateEmployeeField(idx, 'name', name);
        Storage.updateEmployeeField(idx, 'nationalId', document.getElementById('editWorkerNationalId').value.trim());
        Storage.updateEmployeeField(idx, 'contractor', contractor);
        Storage.updateEmployeeField(idx, 'workerRate', document.getElementById('editWorkerRate').value);
        Storage.updateEmployeeField(idx, 'contractorRate', document.getElementById('editContractorRate').value);
        Storage.updateEmployeeField(idx, 'loans', document.getElementById('editWorkerLoans').value);
        Storage.updateEmployeeField(idx, 'penalties', document.getElementById('editWorkerPenalties').value);

        if (contractor && !Storage.data.contractors.includes(contractor)) {
            Storage.data.contractors.push(contractor);
            Storage.save();
        }

        document.getElementById('editWorkerModal').classList.remove('show');
        this.renderMonthlySheetTable();
        this.renderDailyView();
        App.renderWorkersDirectory();
        App.showToast('تم تحديث بيانات العامل والمقاول بنجاح', 'success');
    },

    confirmDeleteWorker(idx) {
        const monthData = Storage.getActiveMonthData();
        const rec = monthData.records[idx];
        if (!rec) return;

        if (confirm(`هل أنت متأكد من حذف ${rec.name} من كشف هذا الشهر؟\n(ملاحظة: يمكنك استرجاعه في أي وقت من سلة المهملات)`)) {
            Storage.deleteWorkerFromActiveMonth(idx);
            this.renderMonthlySheetTable();
            this.renderDailyView();
            App.renderWorkersDirectory();
            App.showToast(`تم نقل ${rec.name} إلى سلة المهملات`, 'info');
        }
    }
};

window.Attendance = Attendance;
