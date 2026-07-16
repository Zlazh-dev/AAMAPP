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
exports.SetWaliDto = exports.UpdateKelasDto = exports.CreateKelasDto = void 0;
const class_validator_1 = require("class-validator");
class CreateKelasDto {
}
exports.CreateKelasDto = CreateKelasDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama kelas wajib diisi' }),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], CreateKelasDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(7),
    __metadata("design:type", Number)
], CreateKelasDto.prototype, "tingkat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['D', 'E', 'F']),
    __metadata("design:type", String)
], CreateKelasDto.prototype, "fase", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], CreateKelasDto.prototype, "waliGuruId", void 0);
class UpdateKelasDto {
}
exports.UpdateKelasDto = UpdateKelasDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], UpdateKelasDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(7),
    __metadata("design:type", Number)
], UpdateKelasDto.prototype, "tingkat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['D', 'E', 'F']),
    __metadata("design:type", String)
], UpdateKelasDto.prototype, "fase", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Object)
], UpdateKelasDto.prototype, "waliGuruId", void 0);
class SetWaliDto {
}
exports.SetWaliDto = SetWaliDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'waliGuruId harus integer atau null' }),
    __metadata("design:type", Object)
], SetWaliDto.prototype, "waliGuruId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SetWaliDto.prototype, "force", void 0);
//# sourceMappingURL=create-kelas.dto.js.map