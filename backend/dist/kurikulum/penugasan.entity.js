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
exports.Penugasan = void 0;
const typeorm_1 = require("typeorm");
const mapel_entity_1 = require("./mapel.entity");
const kelas_entity_1 = require("../kelas/kelas.entity");
const tahun_ajaran_entity_1 = require("../tahun-ajaran/tahun-ajaran.entity");
const guru_entity_1 = require("../guru/guru.entity");
let Penugasan = class Penugasan {
};
exports.Penugasan = Penugasan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'integer' }),
    __metadata("design:type", Number)
], Penugasan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => mapel_entity_1.Mapel, { nullable: false, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'mapelId' }),
    __metadata("design:type", mapel_entity_1.Mapel)
], Penugasan.prototype, "mapel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Penugasan.prototype, "mapelId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => kelas_entity_1.Kelas, { nullable: false, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'kelasId' }),
    __metadata("design:type", kelas_entity_1.Kelas)
], Penugasan.prototype, "kelas", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Penugasan.prototype, "kelasId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tahun_ajaran_entity_1.TahunAjaran, { nullable: false, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'tahunAjaranId' }),
    __metadata("design:type", tahun_ajaran_entity_1.TahunAjaran)
], Penugasan.prototype, "tahunAjaran", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Penugasan.prototype, "tahunAjaranId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => guru_entity_1.Guru, { nullable: false, onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'guruId' }),
    __metadata("design:type", guru_entity_1.Guru)
], Penugasan.prototype, "guru", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Penugasan.prototype, "guruId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Penugasan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Penugasan.prototype, "updatedAt", void 0);
exports.Penugasan = Penugasan = __decorate([
    (0, typeorm_1.Entity)('penugasan'),
    (0, typeorm_1.Unique)(['mapelId', 'kelasId', 'tahunAjaranId'])
], Penugasan);
//# sourceMappingURL=penugasan.entity.js.map