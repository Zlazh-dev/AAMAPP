"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JadwalKbm = void 0;
const typeorm_1 = require("typeorm");
const penugasan_entity_1 = require("./penugasan.entity");
let JadwalKbm = class JadwalKbm {
};
exports.JadwalKbm = JadwalKbm;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'integer' }),
    __metadata("design:type", Number)
], JadwalKbm.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => penugasan_entity_1.Penugasan, { nullable: false, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'penugasanId' }),
    __metadata("design:type", penugasan_entity_1.Penugasan)
], JadwalKbm.prototype, "penugasan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], JadwalKbm.prototype, "penugasanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], JadwalKbm.prototype, "hari", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time' }),
    __metadata("design:type", String)
], JadwalKbm.prototype, "jamMulai", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'time' }),
    __metadata("design:type", String)
], JadwalKbm.prototype, "jamSelesai", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], JadwalKbm.prototype, "sesiKe", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], JadwalKbm.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], JadwalKbm.prototype, "updatedAt", void 0);
exports.JadwalKbm = JadwalKbm = __decorate([
    (0, typeorm_1.Entity)('jadwal_kbm')
], JadwalKbm);
//# sourceMappingURL=jadwal-kbm.entity.js.map