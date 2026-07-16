import { PartialType } from '@nestjs/mapped-types';
import { CreateMapelDto } from './create-mapel.dto';

export class UpdateMapelDto extends PartialType(CreateMapelDto) {}
