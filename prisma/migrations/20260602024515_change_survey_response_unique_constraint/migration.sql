/*
  Warnings:

  - A unique constraint covering the columns `[surveyId,provinceId,customerNumber]` on the table `SurveyResponse` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SurveyResponse_surveyId_customerNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_surveyId_provinceId_customerNumber_key" ON "SurveyResponse"("surveyId", "provinceId", "customerNumber");
