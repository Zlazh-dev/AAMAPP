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
exports.UpdateSiswaDto = exports.CreateSiswaDto = void 0;
const class_validator_1 = require("class-validator");
class CreateSiswaDto {
}
exports.CreateSiswaDto = CreateSiswaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'NIS wajib diisi' }),
    (0, class_validator_1.MaxLength)(20),
    (0, class_validator_1.Matches)(/^[0-9A-Za-z\-_]+$/, {
        message: 'NIS mengandung karakter tidak valid',
    }),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "nis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    (0, class_validator_1.Matches)(/^[0-9A-Za-z\-_]*$/, {
        message: 'NISN mengandung karakter tidak valid',
    }),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "nisn", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nama siswa wajib diisi' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['L', 'P'], { message: 'jenisKelamin harus L atau P' }),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "jenisKelamin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'tanggalLahir harus format ISO date (YYYY-MM-DD)' }),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "tanggalLahir", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CreateSiswaDto.prototype, "kelasId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "namaAyah", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "namaIbu", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['aktif', 'nonaktif']),
    __metadata("design:type", String)
], CreateSiswaDto.prototype, "status", void 0);
class UpdateSiswaDto {
}
exports.UpdateSiswaDto = UpdateSiswaDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], UpdateSiswaDto.prototype, "nis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", Object)
], UpdateSiswaDto.prototype, "nisn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateSiswaDto.prototype, "nama", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['L', 'P']),
    __metadata("design:type", String)
], UpdateSiswaDto.prototype, "jenisKelamin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSiswaDto.prototype, "tanggalLahir", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], UpdateSiswaDto.prototype, "kelasId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateSiswaDto.prototype, "namaAyah", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", Object)
], UpdateSiswaDto.prototype, "namaIbu", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['aktif', 'nonaktif']),
    __metadata("design:type", String)
], UpdateSiswaDto.prototype, "status", void 0);
//# sourceMappingURL=create-siswa.dto.js.map