/**
 * Natural Snacks HR System - Rich Export & Printing Module (Offline)
 * موديول تصدير الإكسيل الملون والمنسق بالكامل والطباعة بدقة عالية
 */

const Exporter = {
    async exportToExcel() {
        const monthName = Storage.getActiveMonthName();
        const daysCount = Attendance.getDaysInMonth(monthName);
        const grouped = Attendance.getGroupedRecords();

        App.showToast('جاري تجهيز وتنسيق ملف الإكسيل الملون...', 'info');

        if (typeof ExcelJS !== 'undefined') {
            try {
                const wb = new ExcelJS.Workbook();
                wb.creator = 'Natural Snacks HR System';
                wb.created = new Date();

                const ws = wb.addWorksheet(monthName.substring(0, 31), {
                    views: [{ rightToLeft: true }]
                });

                // Title Banner Row
                const titleRow = ws.addRow([`شركة ناتشورال سناكس (Natural Snacks) - كشف حضور ورواتب ${monthName}`]);
                titleRow.height = 34;
                titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
                titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                ws.mergeCells(1, 1, 1, daysCount + 14);

                // Column Headers
                const headers = ['م', 'اسم العامل / العربية', 'الرقم القومي', 'المقاول'];
                for (let d = 1; d <= daysCount; d++) {
                    headers.push(`${d}`);
                }
                headers.push(
                    'إجمالي الورديات',
                    'سعر الوردية',
                    'المستحق قبل السلف',
                    'سلف',
                    'جزاءات',
                    'صافي المستحق',
                    'سعر المقاول',
                    'مستحق المقاول',
                    'المدفوع',
                    'المتبقي'
                );

                const headerRow = ws.addRow(headers);
                headerRow.height = 28;
                headerRow.eachCell((cell) => {
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };
                });

                let globalCounter = 1;
                let overallShifts = 0;
                let overallGross = 0;
                let overallLoans = 0;
                let overallPenalties = 0;
                let overallNetWorker = 0;
                let overallContractorDue = 0;
                let overallPaid = 0;
                let overallRemaining = 0;

                for (const contractorName in grouped) {
                    const list = grouped[contractorName];

                    // Contractor Header Banner
                    const contHeaderRow = ws.addRow([`🏢 مجموعة: ${contractorName} (${list.length} سجل)`]);
                    contHeaderRow.height = 24;
                    contHeaderRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    contHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                    contHeaderRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
                    ws.mergeCells(contHeaderRow.number, 1, contHeaderRow.number, daysCount + 14);

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

                        const rowData = [
                            globalCounter++,
                            (rec.isVehicle ? '🚗 ' : '') + rec.name,
                            rec.nationalId || '',
                            rec.contractor || 'عمالة مباشرة'
                        ];

                        for (let d = 1; d <= daysCount; d++) {
                            const val = (rec.attendance && rec.attendance[d] !== undefined) ? rec.attendance[d] : '';
                            rowData.push(val !== '' ? Number(val) : '');
                        }

                        rowData.push(
                            calc.totalShifts,
                            calc.workerRate,
                            calc.totalGross,
                            calc.loans,
                            calc.penalties,
                            calc.netWorkerDue,
                            calc.contractorRate,
                            calc.contractorDue,
                            calc.paid,
                            calc.remaining
                        );

                        const row = ws.addRow(rowData);
                        row.height = 20;

                        row.eachCell((cell, colNumber) => {
                            cell.font = { name: 'Arial', size: 9 };
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                            };

                            if (colNumber === 2) {
                                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                                cell.font = { bold: true };
                            } else {
                                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            }

                            if (colNumber >= 5 && colNumber < 5 + daysCount) {
                                if (cell.value === 1) {
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                                    cell.font = { color: { argb: 'FF047857' }, bold: true };
                                } else if (cell.value === 2) {
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
                                    cell.font = { color: { argb: 'FF1D4ED8' }, bold: true };
                                } else if (cell.value === 3) {
                                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
                                    cell.font = { color: { argb: 'FFB45309' }, bold: true };
                                }
                            }

                            const totalShiftsCol = 5 + daysCount;
                            if (colNumber === totalShiftsCol) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
                                cell.font = { bold: true, color: { argb: 'FF0369A1' } };
                            }

                            if (colNumber === totalShiftsCol + 3 || colNumber === totalShiftsCol + 4) {
                                if (Number(cell.value) > 0) {
                                    cell.font = { color: { argb: 'FFDC2626' }, bold: true };
                                }
                            }

                            if (colNumber === totalShiftsCol + 5) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
                                cell.font = { bold: true, color: { argb: 'FF15803D' } };
                            }

                            if (colNumber === totalShiftsCol + 9) {
                                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
                                cell.font = { bold: true, color: { argb: 'FF92400E' } };
                            }
                        });
                    });

                    // Subtotal row
                    const subRowData = ['', `إجمالي ${contractorName}`, '', ''];
                    for (let d = 1; d <= daysCount; d++) subRowData.push('');
                    subRowData.push(
                        Math.round(subShifts * 10) / 10,
                        '-',
                        subGross,
                        subLoans,
                        subPenalties,
                        subNetWorker,
                        '-',
                        subContractorDue,
                        subPaid,
                        subRemaining
                    );

                    const subRow = ws.addRow(subRowData);
                    subRow.height = 22;
                    subRow.eachCell((cell, colNumber) => {
                        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                        cell.alignment = { horizontal: colNumber === 2 ? 'right' : 'center', vertical: 'middle' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
                        };
                    });

                    overallShifts += subShifts;
                    overallGross += subGross;
                    overallLoans += subLoans;
                    overallPenalties += subPenalties;
                    overallNetWorker += subNetWorker;
                    overallContractorDue += subContractorDue;
                    overallPaid += subPaid;
                    overallRemaining += subRemaining;
                }

                // Grand Total Row
                const grandRowData = ['', '⭐ الإجمالي العام لكافة العمال والمقاولين', '', 'ناتشورال سناكس'];
                for (let d = 1; d <= daysCount; d++) grandRowData.push('');
                grandRowData.push(
                    Math.round(overallShifts * 10) / 10,
                    '-',
                    overallGross,
                    overallLoans,
                    overallPenalties,
                    overallNetWorker,
                    '-',
                    overallContractorDue,
                    overallPaid,
                    overallRemaining
                );

                const grandRow = ws.addRow(grandRowData);
                grandRow.height = 26;
                grandRow.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF065F46' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                    cell.alignment = { horizontal: colNumber === 2 ? 'right' : 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF059669' } },
                        bottom: { style: 'double', color: { argb: 'FF059669' } }
                    };
                });

                const colWidths = [
                    { width: 5 },
                    { width: 25 },
                    { width: 16 },
                    { width: 15 }
                ];
                for (let d = 1; d <= daysCount; d++) {
                    colWidths.push({ width: 4.5 });
                }
                colWidths.push(
                    { width: 14 },
                    { width: 12 },
                    { width: 15 },
                    { width: 9 },
                    { width: 9 },
                    { width: 15 },
                    { width: 12 },
                    { width: 14 },
                    { width: 10 },
                    { width: 14 }
                );
                ws.columns = colWidths;

                const buffer = await wb.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const fileName = `مرتبات_وحضور_${monthName.replace(/\s+/g, '_')}_ناتشورال_سناكس.xlsx`;
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                App.showToast(`تم تصدير ملف الإكسيل الملون (${fileName}) بنجاح!`, 'success');
                return;
            } catch (err) {
                console.error('ExcelJS error:', err);
            }
        }

        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const table = document.getElementById('mainPayrollTable');
            const ws = XLSX.utils.table_to_sheet(table);
            if (!ws['!views']) ws['!views'] = [];
            ws['!views'].push({ RTL: true });
            XLSX.utils.book_append_sheet(wb, ws, monthName.substring(0, 31));
            XLSX.writeFile(wb, `مرتبات_${monthName}.xlsx`);
            App.showToast('تم تصدير ملف الإكسيل بنجاح', 'success');
        }
    },

    /**
     * Print Organized Payroll Summary (Financial Sheet without daily columns)
     * طباعة كشف مسير الرواتب المالي المنظم والمناسب تماماً لورقة A4 / PDF
     */
    printPayrollSummary() {
        const monthName = Storage.getActiveMonthName();
        const grouped = Attendance.getGroupedRecords();
        const printArea = document.getElementById('payrollSummaryPrintArea');
        if (!printArea) return;

        const d = new Date();
        const printDate = `${d.getFullYear()}/${(d.getMonth()+1)}/${d.getDate()} - ${d.toLocaleTimeString('ar-EG')}`;

        let rowsHtml = '';
        let globalCounter = 1;
        let overallShifts = 0;
        let overallGross = 0;
        let overallLoans = 0;
        let overallPenalties = 0;
        let overallNetWorker = 0;
        let overallContractorDue = 0;
        let overallPaid = 0;
        let overallRemaining = 0;

        for (const contractorName in grouped) {
            const list = grouped[contractorName];

            rowsHtml += `
                <tr class="contractor-print-row">
                    <td colspan="14" style="text-align:right; padding:6px 12px; background:#1e293b; color:#ffffff;">
                        🏢 مجموعة: ${contractorName} (${list.length} سجل)
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

                rowsHtml += `
                    <tr style="${rec.isVehicle ? 'background:#faf5ff; font-weight:bold;' : ''}">
                        <td>${globalCounter++}</td>
                        <td style="text-align:right; font-weight:bold;">
                            ${rec.isVehicle ? '🚗 ' : '👤 '}${rec.name}
                        </td>
                        <td>${rec.contractor}</td>
                        <td style="font-weight:bold; color:#0369a1; background:#f0f9ff;">${calc.totalShifts}</td>
                        <td>${calc.workerRate} ج</td>
                        <td>${calc.totalGross.toLocaleString('ar-EG')}</td>
                        <td style="color:${calc.loans > 0 ? '#b91c1c; font-weight:bold;' : '#64748b;'}">${calc.loans > 0 ? calc.loans.toLocaleString('ar-EG') : '-'}</td>
                        <td style="color:${calc.penalties > 0 ? '#dc2626; font-weight:bold;' : '#64748b;'}">${calc.penalties > 0 ? calc.penalties.toLocaleString('ar-EG') : '-'}</td>
                        <td style="background:#ecfdf5; color:#065f46; font-weight:bold; font-size:9.5pt;">${calc.netWorkerDue.toLocaleString('ar-EG')} ج.م</td>
                        <td>${calc.contractorRate > 0 ? calc.contractorRate + ' ج' : '-'}</td>
                        <td style="font-weight:bold;">${calc.contractorDue > 0 ? calc.contractorDue.toLocaleString('ar-EG') : '-'}</td>
                        <td>${calc.paid > 0 ? calc.paid.toLocaleString('ar-EG') : '-'}</td>
                        <td style="background:#fffbeb; color:#92400e; font-weight:bold;">${calc.remaining.toLocaleString('ar-EG')} ج.م</td>
                        <td style="width:75px; border-style:dashed;"></td>
                    </tr>
                `;
            });

            // Subtotal
            rowsHtml += `
                <tr class="contractor-print-subtotal" style="background:#f1f5f9; font-weight:bold;">
                    <td colspan="3" style="text-align:right;">إجمالي ${contractorName}</td>
                    <td style="background:#e0f2fe; color:#0369a1;">${Math.round(subShifts * 10) / 10}</td>
                    <td>-</td>
                    <td>${subGross.toLocaleString('ar-EG')}</td>
                    <td style="color:#b91c1c;">${subLoans.toLocaleString('ar-EG')}</td>
                    <td style="color:#dc2626;">${subPenalties.toLocaleString('ar-EG')}</td>
                    <td style="background:#dcfce7; color:#15803d; font-weight:bold;">${subNetWorker.toLocaleString('ar-EG')}</td>
                    <td>-</td>
                    <td>${subContractorDue.toLocaleString('ar-EG')}</td>
                    <td>${subPaid.toLocaleString('ar-EG')}</td>
                    <td style="background:#fef3c7; color:#b45309; font-weight:bold;">${subRemaining.toLocaleString('ar-EG')}</td>
                    <td>-</td>
                </tr>
            `;

            overallShifts += subShifts;
            overallGross += subGross;
            overallLoans += subLoans;
            overallPenalties += subPenalties;
            overallNetWorker += subNetWorker;
            overallContractorDue += subContractorDue;
            overallPaid += subPaid;
            overallRemaining += subRemaining;
        }

        // Grand Total
        rowsHtml += `
            <tr class="grand-print-total" style="background:#d1fae5; color:#065f46; font-weight:800; font-size:10pt;">
                <td colspan="3" style="text-align:right;">⭐ الإجمالي العام للشركة</td>
                <td style="background:#bae6fd; color:#0284c7;">${Math.round(overallShifts * 10) / 10}</td>
                <td>-</td>
                <td>${overallGross.toLocaleString('ar-EG')}</td>
                <td style="color:#991b1b;">${overallLoans.toLocaleString('ar-EG')}</td>
                <td style="color:#991b1b;">${overallPenalties.toLocaleString('ar-EG')}</td>
                <td style="background:#bbf7d0; color:#14532d; font-size:10.5pt;">${overallNetWorker.toLocaleString('ar-EG')} ج.م</td>
                <td>-</td>
                <td>${overallContractorDue.toLocaleString('ar-EG')} ج.م</td>
                <td>${overallPaid.toLocaleString('ar-EG')} ج.م</td>
                <td style="background:#fde68a; color:#78350f; font-size:10.5pt;">${overallRemaining.toLocaleString('ar-EG')} ج.م</td>
                <td>-</td>
            </tr>
        `;

        let printHtml = `
            <div class="payroll-print-sheet">
                <div class="payroll-print-header">
                    <div>
                        <h2 style="margin:0; font-size:15pt; color:#059669;">شركة ناتشورال سناكس (Natural Snacks)</h2>
                        <p style="margin:2px 0; font-size:9.5pt; color:#475569;">إدارة الموارد البشرية والرواتب والعمالة</p>
                    </div>
                    <div class="payroll-print-title">
                        <h1 style="margin:0; font-size:16pt; border:2px solid #059669; color:#065f46; background:#d1fae5; padding:5px 18px; border-radius:8px; display:inline-block;">
                            كشف مسير رواتب وأجور: ${monthName}
                        </h1>
                    </div>
                    <div style="text-align:left; font-size:8.5pt;">
                        <div><strong>تاريخ الطباعة:</strong> ${printDate}</div>
                        <div><strong>عدد السجلات:</strong> ${globalCounter - 1}</div>
                    </div>
                </div>

                <div class="payroll-summary-banner">
                    <div><strong>إجمالي الورديات:</strong> <span style="font-size:11pt; color:#0369a1; font-weight:bold;">${Math.round(overallShifts * 10) / 10}</span></div>
                    <div><strong>إجمالي صافي أجور العمال:</strong> <span style="font-size:12pt; color:#059669; font-weight:bold;">${overallNetWorker.toLocaleString('ar-EG')} ج.م</span></div>
                    <div><strong>إجمالي مستحقات المقاولين:</strong> <span style="font-size:11pt; color:#2563eb; font-weight:bold;">${overallContractorDue.toLocaleString('ar-EG')} ج.م</span></div>
                    <div><strong>إجمالي المتبقي للجميع:</strong> <span style="font-size:12pt; color:#d97706; font-weight:bold;">${overallRemaining.toLocaleString('ar-EG')} ج.م</span></div>
                </div>

                <table class="payroll-print-table">
                    <thead>
                        <tr>
                            <th style="width:30px;">م</th>
                            <th style="text-align:right;">اسم العامل / العربية</th>
                            <th style="width:95px;">المقاول / التبعية</th>
                            <th style="width:55px;">إجمالي الورديات</th>
                            <th style="width:50px;">سعر الوردية</th>
                            <th style="width:65px;">المستحق</th>
                            <th style="width:45px;">سلف</th>
                            <th style="width:45px;">جزاءات</th>
                            <th style="width:80px; background:#047857;">صافي المستحق</th>
                            <th style="width:55px;">سعر المقاول</th>
                            <th style="width:65px;">مستحق المقاول</th>
                            <th style="width:50px;">المدفوع</th>
                            <th style="width:75px; background:#b45309;">المتبقي</th>
                            <th style="width:75px;">توقيع الاستلام</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="payroll-signatures">
                    <div class="signature-box">
                        <strong>إعداد (مسؤول HR)</strong>
                        <div class="signature-line">التوقيع والتاريخ</div>
                    </div>
                    <div class="signature-box">
                        <strong>المراجع / الحسابات</strong>
                        <div class="signature-line">التوقيع والتاريخ</div>
                    </div>
                    <div class="signature-box">
                        <strong>اعتماد المدير العام</strong>
                        <div class="signature-line">الاعتماد والختم</div>
                    </div>
                </div>
            </div>
        `;

        printArea.innerHTML = printHtml;

        document.body.classList.remove('printing-custody', 'printing-payroll-full');
        document.body.classList.add('printing-payroll-summary');

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('printing-payroll-summary');
            }, 1000);
        }, 300);
    },

    /**
     * Print Full 31 Days Matrix (Full Sheet)
     */
    printMonthlySheet() {
        // By default use the clean summary sheet which fits on paper perfectly!
        this.printPayrollSummary();
    },

    printFullAttendanceMatrix() {
        App.switchTab('monthly-sheet');
        document.body.classList.remove('printing-custody', 'printing-payroll-summary');
        document.body.classList.add('printing-payroll-full');

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('printing-payroll-full');
            }, 1000);
        }, 300);
    }
};

window.Exporter = Exporter;
