-- DropIndex
DROP INDEX "SurveyResponse_surveyId_provinceId_customerNumber_key";

-- AlterTable
ALTER TABLE "SurveyResponse" ALTER COLUMN "customerNumber" DROP NOT NULL;
