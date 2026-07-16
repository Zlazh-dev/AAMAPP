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
exports.Kelas = void 0;
const typeorm_1 = require("typeorm");
const guru_entity_1 = require("../guru/guru.entity");
let Kelas = class Kelas {
};
exports.Kelas = Kelas;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'integer' }),
    __metadata("design:type", Number)
], Kelas.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], Kelas.prototype, "nama", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Kelas.prototype, "tingkat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 1, default: 'D' }),
    __metadata("design:type", String)
], Kelas.prototype, "fase", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true, unique: true }),
    __metadata("design:type", Object)
], Kelas.prototype, "waliGuruId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => guru_entity_1.Guru, (guru) => guru.waliKelas, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'waliGuruId' }),
    __metadata("design:type", Object)
], Kelas.prototype, "waliGuru", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Kelas.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Kelas.prototype, "updatedAt", void 0);
exports.Kelas = Kelas = __decorate([
    (0, typeorm_1.Entity)('kelas')
], Kelas);
//# sourceMappingURL=kelas.entity.js.map