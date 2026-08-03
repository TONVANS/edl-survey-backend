/*
  Warnings:

  - You are about to drop the column `transformer100kVA` on the `SurveyResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "transformer100kVA";

-- CreateTable
CREATE TABLE "TransformerDetail" (
    "id" TEXT NOT NULL,
    "surveyResponseId" TEXT NOT NULL,
    "sizeKVA" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TransformerDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransformerDetail_surveyResponseId_idx" ON "TransformerDetail"("surveyResponseId");

-- AddForeignKey
ALTER TABLE "TransformerDetail" ADD CONSTRAINT "TransformerDetail_surveyResponseId_fkey" FOREIGN KEY ("surveyResponseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
