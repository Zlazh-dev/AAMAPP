"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WIB = void 0;
exports.formatWIB = formatWIB;
exports.formatRelativeWIB = formatRelativeWIB;
exports.todayWIB = todayWIB;
exports.toWIB = toWIB;
exports.formatTimeWIB = formatTimeWIB;
exports.formatDateWIB = formatDateWIB;
exports.dayNameWIB = dayNameWIB;
const date_fns_tz_1 = require("date-fns-tz");
exports.WIB = 'Asia/Jakarta';
function formatWIB(date, fmt = 'yyyy-MM-dd HH:mm:ss') {
    const d = typeof date === 'string' ? new Date(date) : date;
    const zoned = (0, date_fns_tz_1.toZonedTime)(d, exports.WIB);
    return (0, date_fns_tz_1.format)(zoned, fmt);
}
function formatRelativeWIB(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60)
        return 'baru saja';
    if (diffMin < 60)
        return `${diffMin} menit lalu`;
    if (diffHour < 24)
        return `${diffHour} jam lalu`;
    if (diffDay < 30)
        return `${diffDay} hari lalu`;
    return formatWIB(d, 'dd MMM yyyy');
}
function todayWIB() {
    return (0, date_fns_tz_1.toZonedTime)(new Date(), exports.WIB);
}
function toWIB(date) {
    return (0, date_fns_tz_1.fromZonedTime)(date, exports.WIB);
}
function formatTimeWIB(date) {
    return formatWIB(date, 'HH:mm:ss');
}
function formatDateWIB(date) {
    return formatWIB(date, 'yyyy-MM-dd');
}
function dayNameWIB(date) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = typeof date === 'string' ? new Date(date) : date;
    const zoned = (0, date_fns_tz_1.toZonedTime)(d, exports.WIB);
    return days[zoned.getDay()];
}
//# sourceMappingURL=wib.util.js.map