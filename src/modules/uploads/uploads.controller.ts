// import { BadRequestException, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
// import { FilesInterceptor } from '@nestjs/platform-express';
// import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
// import { diskStorage } from 'multer';
// import { extname } from 'path';
// import { Roles } from '../../common/decorators/roles.decorator';
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
// import { RolesGuard } from '../../common/guards/roles.guard';

// const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// @ApiTags('Admin / Uploads')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('ADMIN', 'STAFF')
// @Controller('admin/uploads')
// export class UploadsController {
//   @Post()
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(
//     FilesInterceptor('files', 10, {
//       storage: diskStorage({
//         destination: './uploads',
//         filename: (_req, file, cb) => {
//           const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
//           cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
//         },
//       }),
//       limits: { fileSize: 5 * 1024 * 1024 },
//       fileFilter: (_req, file, cb) => {
//         if (!ALLOWED.includes(extname(file.originalname).toLowerCase())) {
//           return cb(new BadRequestException('ຮອງຮັບສະເພາະຮູບພາບ jpg, png, webp, gif'), false);
//         }
//         cb(null, true);
//       },
//     }),
//   )
//   upload(@UploadedFiles() files: Express.Multer.File[]) {
//     const base = process.env.PUBLIC_UPLOAD_URL ?? 'http://localhost:4000/uploads';
//     return {
//       files: (files ?? []).map((f) => ({ url: `${base}/${f.filename}`, filename: f.filename, size: f.size })),
//     };
//   }
// }

import { BadRequestException, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { S3Client } from '@aws-sdk/client-s3';
import * as multerS3 from 'multer-s3';
import { extname } from 'path';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// ສ້າງ S3 Client ເຊື່ອມຕໍ່ກັບ Cloudflare R2 ໂດຍໃຊ້ Endpoint ຈາກ Account Details
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

@ApiTags('Admin / Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/uploads')
export class UploadsController {
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multerS3({
        s3: s3 as any,
        bucket: process.env.R2_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          const filename = `${unique}${extname(file.originalname).toLowerCase()}`;
          cb(null, filename);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.includes(extname(file.originalname).toLowerCase())) {
          return cb(new BadRequestException('ຮອງຮັບສະເພາະຮູບພາບ jpg, png, webp, gif'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      files: (files ?? []).map((f: any) => ({
        url: f.location || `${process.env.R2_PUBLIC_URL}/${f.key}`,
        filename: f.key,
        size: f.size,
      })),
    };
  }
}