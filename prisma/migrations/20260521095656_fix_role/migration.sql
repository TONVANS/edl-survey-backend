/*
  Warnings:

  - The values [USER,ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `AnswerOption` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `consumerNumber` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `consumerTypeId` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ConsumerType` table. If the table is not empty, all the data it contains will be lost.
  - The required column `id` was added to the `AnswerOption` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `District` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Province` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Region` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerNumber` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerType` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `districtId` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Village` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GOVERNMENT', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'REGION_ADMIN', 'PROVINCE_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PROVINCE_ADMIN';
COMMIT;

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_consumerTypeId_fkey";

-- DropIndex
DROP INDEX "Answer_responseId_questionId_key";

-- AlterTable
ALTER TABLE "AnswerOption" DROP CONSTRAINT "AnswerOption_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "AnswerOption_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "District" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Province" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Question" ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "value" TEXT,
ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "consumerNumber",
DROP COLUMN "consumerTypeId",
DROP COLUMN "createdAt",
ADD COLUMN     "customerNumber" TEXT NOT NULL,
ADD COLUMN     "customerType" "CustomerType" NOT NULL,
ADD COLUMN     "districtId" TEXT NOT NULL,
ADD COLUMN     "provinceId" TEXT NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SurveySection" ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "role" SET DEFAULT 'PROVINCE_ADMIN';

-- AlterTable
ALTER TABLE "Village" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ConsumerType";

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
