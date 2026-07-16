"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMapelDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_mapel_dto_1 = require("./create-mapel.dto");
class UpdateMapelDto extends (0, mapped_types_1.PartialType)(create_mapel_dto_1.CreateMapelDto) {
}
exports.UpdateMapelDto = UpdateMapelDto;
//# sourceMappingURL=update-mapel.dto.js.map