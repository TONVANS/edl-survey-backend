/*
  Warnings:

  - You are about to drop the column `customerType` on the `SurveyResponse` table. All the data in the column will be lost.
  - Added the required column `customerTypeId` to the `SurveyResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "customerType",
ADD COLUMN     "customerTypeId" TEXT NOT NULL,
ADD COLUMN     "monoPhaseMeterCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "threePhaseMeterCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transformer100kVA" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "CustomerType";

-- CreateTable
CREATE TABLE "CustomerType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerType_name_key" ON "CustomerType"("name");

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_customerTypeId_fkey" FOREIGN KEY ("customerTypeId") REFERENCES "CustomerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
