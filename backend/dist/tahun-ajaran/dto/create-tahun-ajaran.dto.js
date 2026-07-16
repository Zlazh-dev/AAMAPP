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
exports.UpdateTahunAjaranDto = exports.CreateTahunAjaranDto = void 0;
const class_validator_1 = require("class-validator");
const TAHUN_AJARAN_REGEX = /^\d{4}\/\d{4}$/;
class CreateTahunAjaranDto {
}
exports.CreateTahunAjaranDto = CreateTahunAjaranDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(9, 9, { message: 'nama harus berformat YYYY/YYYY' }),
    (0, class_validator_1.Matches)(TAHUN_AJARAN_REGEX, {
        message: 'nama harus berformat YYYY/YYYY (contoh 2025/2026)',
    }),
    __metadata("design:type", String)
], CreateTahunAjaranDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsIn)([1, 2], { message: 'semester harus 1 (Ganjil) atau 2 (Genap)' }),
    __metadata("design:type", Number)
], CreateTahunAjaranDto.prototype, "semester", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTahunAjaranDto.prototype, "aktif", void 0);
class UpdateTahunAjaranDto {
}
exports.UpdateTahunAjaranDto = UpdateTahunAjaranDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(9, 9),
    (0, class_validator_1.Matches)(TAHUN_AJARAN_REGEX),
    __metadata("design:type", String)
], UpdateTahunAjaranDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([1, 2]),
    __metadata("design:type", Number)
], UpdateTahunAjaranDto.prototype, "semester", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTahunAjaranDto.prototype, "aktif", void 0);
//# sourceMappingURL=create-tahun-ajaran.dto.js.map