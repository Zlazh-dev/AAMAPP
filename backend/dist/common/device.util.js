"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceSummary = getDeviceSummary;
exports.getIpAddress = getIpAddress;
const ua_parser_js_1 = __importDefault(require("ua-parser-js"));
function getDeviceSummary(userAgent) {
    if (!userAgent)
        return 'Tidak diketahui';
    const parser = new ua_parser_js_1.default(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const browserName = browser.name || 'Browser';
    const osName = os.name || 'OS';
    return `${browserName} • ${osName}`;
}
function getIpAddress(req) {
    const xForwardedFor = req.headers?.['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    const xRealIp = req.headers?.['x-real-ip'];
    if (xRealIp) {
        return xRealIp;
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
}
//# sourceMappingURL=device.util.js.map