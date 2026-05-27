-- Step 1: Add new columns with safe defaults for existing data
ALTER TABLE "SurveyResponse" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SurveyResponse" ADD COLUMN "customerPhoneNumber" TEXT;

-- Step 2: Copy existing customerNumber text value to customerName for existing rows
UPDATE "SurveyResponse" SET "customerName" = 'Unknown' WHERE "customerName" = '';

-- Step 3: Remove the default (schema says it's required, not defaulted)
ALTER TABLE "SurveyResponse" ALTER COLUMN "customerName" DROP DEFAULT;

-- Step 4: Change customerNumber from TEXT to INTEGER
-- First, cast existing text values to integer safely
ALTER TABLE "SurveyResponse" ALTER COLUMN "customerNumber" TYPE INTEGER USING "customerNumber"::integer;

-- Step 5: Add unique constraint
CREATE UNIQUE INDEX "SurveyResponse_surveyId_customerNumber_key" ON "SurveyResponse"("surveyId", "customerNumber");

-- Step 6: Add all missing indexes on SurveyResponse
CREATE INDEX "SurveyResponse_provinceId_idx" ON "SurveyResponse"("provinceId");
CREATE INDEX "SurveyResponse_districtId_idx" ON "SurveyResponse"("districtId");
CREATE INDEX "SurveyResponse_villageId_idx" ON "SurveyResponse"("villageId");
CREATE INDEX "SurveyResponse_customerTypeId_idx" ON "SurveyResponse"("customerTypeId");
CREATE INDEX "SurveyResponse_submittedAt_idx" ON "SurveyResponse"("submittedAt");

-- Step 7: Add missing indexes on other tables
CREATE INDEX "Answer_responseId_idx" ON "Answer"("responseId");
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");
CREATE INDEX "Answer_ratingValue_idx" ON "Answer"("ratingValue");
CREATE INDEX "AnswerOption_answerId_idx" ON "AnswerOption"("answerId");
CREATE INDEX "AnswerOption_optionId_idx" ON "AnswerOption"("optionId");
CREATE INDEX "District_provinceId_idx" ON "District"("provinceId");
CREATE INDEX "Province_regionId_idx" ON "Province"("regionId");
CREATE INDEX "Question_sectionId_idx" ON "Question"("sectionId");
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");
CREATE INDEX "SurveySection_surveyId_idx" ON "SurveySection"("surveyId");
CREATE INDEX "User_regionId_idx" ON "User"("regionId");
CREATE INDEX "User_provinceId_idx" ON "User"("provinceId");
CREATE INDEX "Village_districtId_idx" ON "Village"("districtId");
