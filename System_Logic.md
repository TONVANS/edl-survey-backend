# **System Logic: Electricity Customer Satisfaction Survey**

This document provides the core business logic, data flow, and access control mechanisms for the Electricity Customer Satisfaction Survey system based on the defined Prisma Schema. AI agents and developers should use this document as a guideline for implementing APIs, Frontend logic, and Dashboard queries.

## **1\. System Overview**

The system allows the State Electricity Authority to collect customer satisfaction data through dynamic surveys. It features an anonymous public submission portal and a role-based admin dashboard for data analysis, filtering, and Excel export.

## **2\. Core Entities & Relationships**

### **2.1 Geographic Hierarchy**

* **Region** (e.g., Central, North, South) \-\> Contains many **Provinces**.  
* **Province** \-\> Contains many **Districts**.  
* **District** \-\> Contains many **Villages**.  
* *Logic:* This hierarchy is strictly enforced for data filtering and Admin role assignments. When creating or updating a Village, the API requires `regionId`, `provinceId`, and `districtId` in the payload to rigorously validate that the district belongs to the correct province and region as per the hierarchy.

### **2.2 Survey Structure**

* **Survey:** The master record (e.g., "Annual Satisfaction 2026"). Can be marked isActive.  
* **SurveySection:** Grouping of questions (e.g., "Service Speed", "Staff Behavior").  
* **Question:** The actual question. Has a type (RATING, TEXT, SINGLE\_CHOICE, MULTIPLE\_CHOICE).  
* **QuestionOption:** Used ONLY for SINGLE\_CHOICE and MULTIPLE\_CHOICE question types.

### **2.3 Response Data**

* **SurveyResponse:** A single submission by a user. Contains geographic IDs, customer details (customerNumber as Int, customerName, customerPhoneNumber, customerTypeId), and links to the specific Survey.  
* **CustomerType:** A table containing categories of customers (e.g., RESIDENTIAL, COMMERCIAL). Each SurveyResponse must relate to one CustomerType. Management of CustomerTypes is restricted to SUPER_ADMIN.
* **Answer:** Individual answers tied to a SurveyResponse and a Question. Stores raw text/rating in value, or relates to specific QuestionOption(s) via AnswerOption.

## **3\. Workflows & Data Logic**

### 3.1 Public User Submission (No Authentication Required)

1. **Trigger:** User scans a QR code or clicks a link pointing to the active survey (GET /api/surveys/active). The endpoint can optionally take a `surveyId` query parameter (GET /api/surveys/active?surveyId=uuid) to fetch a specific survey ONLY if it is active.
2. Form **Load:** The frontend loads the Survey, including nested SurveySection, Question, and QuestionOption where isActive = true. It also fetches available **CustomerTypes** (GET /api/customer-types).
3. **Submission Payload:** The frontend sends a POST request containing:  
   * Customer Info: customerNumber (Int), customerName (String), customerPhoneNumber (Optional String), customerType (UUID of the selected CustomerType).  
   * Meter/Transformer Info: monoPhaseMeterCount, threePhaseMeterCount, transformer100kVA (All Int, default 0).
   * Location IDs: villageId, districtId, provinceId, regionId.  
   * Answers array: { questionId: String, value?: String, optionIds?: String\[\] }.  
4. **Database Write Logic:** \* Create a SurveyResponse.  
   * Iterate through the answers array and create Answer records.  
   * If the question type is SINGLE\_CHOICE or MULTIPLE\_CHOICE, create records in the AnswerOption junction table.

### **3.2 Role-Based Access Control (RBAC) & Data Visibility**

The system has four roles. The User model handles authentication for Admins. All authenticated users can change their own password.

* **PUBLIC\_USER:** \* *Access:* Cannot login. Only allowed to POST to the survey submission endpoint.  
* **SUPER\_ADMIN:**  
  * *Access:* Full CRUD on all tables (Users, Surveys, Regions, CustomerTypes, etc.). Can manage users (Reset password, change role, change status isActive).
  * *Data Visibility:* Can see ALL SurveyResponse data.  
* **REGION\_ADMIN:**  
  * *Access:* Must have a non-null regionId in their User record (strictly validated on creation/update).
  * *Data Visibility:* Can only read SurveyResponse data where regionId === Admin.regionId
* **PROVINCE_ADMIN:**  
  * *Access:* Must have a non-null provinceId in their User record (strictly validated on creation/update).
  * *Data Visibility:* Can only read SurveyResponse data where provinceId === Admin.provinceId

---

### **3.3 Reporting & Aggregations (Overall Satisfaction Summary)**

1. **Trigger:** Authenticated administrative users (`SUPER_ADMIN`, `REGION_ADMIN`, or `PROVINCE_ADMIN`) request the satisfaction summary report (`GET /v1/reports/overall-summary`).
2. **Dynamic RBAC Data Scoping:**
   - **SUPER_ADMIN**: No additional where constraints are appended.
   - **REGION_ADMIN**: Automatically scopes queries to responses where the province belongs to their region: `where.province = { regionId: user.regionId }`.
   - **PROVINCE_ADMIN**: Automatically scopes queries to their specific province: `where.provinceId = user.provinceId`.
3. **Survey Resolution Flow:**
   - If a specific `surveyId` query parameter is provided, the report targets that survey.
   - If omitted, the system queries the active survey (`isActive: true`), falling back to the most recently created survey if no active survey exists.
   - If no survey exists in the database, a default zero-filled report structure is returned gracefully instead of generating a `404` or `500` error.
4. **Aggregation Engineering:**
   - **Overall Satisfaction**: Accomplished via an optimized Prisma `groupBy` aggregation on the `Answer` model (filtered to `type: RATING`), counting occurrences of each rating value (1-5).
   - **Rating Distribution**: Formed from the grouped count results.
   - **Average Rating**: Calculated mathematically as the total sum of ratings divided by the total count of ratings, explicitly rounded to 2 decimal places.
   - **Section Breakdown**: Fetches sections of the resolved survey and their `RATING` questions. Groups `Answer` rating sums and counts by `questionId` within the scoped responses, then mathematically aggregates them per section. All averages are rounded to 2 decimal places, and the total count of rating questions in each section is included.
### **3.4 Geographic Breakdown Report Aggregation**

1. **Trigger:** Authenticated administrative users request the geographic breakdown (GET /v1/reports/geographic).
2. **Dynamic Aggregation Level:**
egion, province, district, illage).
egion level, data is aggregated by grouping provinces and mapping them to their respective regions.
3. **Data Scoping:**
egionId or provinceId.
egionId. Cannot query other regions.
   - PROVINCE_ADMIN: Scoped to their provinceId. Aggregation level is restricted to district or illage.
4. **Calculations:**
   - **Total Responses**: Count of SurveyResponse records in the current period.
atingValue from Answer records linked to the scoped responses.
   - **Response Growth**: Percentage comparison between the current period and a previous period of the same duration. Returns 
ull if no previous data is available.


### **3.5 Customer Type Analysis Report Aggregation**

1. **Trigger:** Authenticated administrative users request the customer type analysis (GET /v1/reports/customer-type-analysis).
2. **Logic & Aggregations:**
   - **Data Scoping:** RBAC rules apply identically to other reports (SUPER_ADMIN sees all, REGION_ADMIN scoped to region, PROVINCE_ADMIN scoped to province).
   - **Meter/Transformer Totals**: Sums monoPhaseMeterCount, 	hreePhaseMeterCount, and 	ransformer100kVA grouped by customerTypeId.
atingDistribution (1-5 stars) for each customer type.
   - **Left Join Behavior**: Fetches all existing CustomerType records. If a type has no responses in the current scope, it is returned with zero values instead of being omitted.
3. **Sorting:** Results are sorted by 	otalResponses in descending order by default.


### **3.6 Raw Data Export (Excel Streaming)**

1. **Trigger:** Authenticated administrative users request the raw data export (GET /v1/reports/export-excel).
2. **Performance Engineering:**
   - **Memory Efficiency:** Uses exceljs streaming writer to pipe data directly to the HTTP response. This prevents the server from loading thousands of records into RAM.
   - **Batch Processing:** Fetches data from PostgreSQL in batches of 500 using Prisma cursor-based pagination for stable performance under load.
3. **Data Integrity & Logic:**
   - **Dual Sheet Structure:** Generates two sheets: 'Responses' for high-level submission data and 'Answers' for a flattened view of every individual answer.
   - **Answer Flattening:** SINGLE_CHOICE and MULTIPLE_CHOICE answers are flattened into a single semicolon-separated string for readability in spreadsheet software.
   - **Summary Calculation:** Sheet 1 automatically appends a summary row with sums for all meter and transformer counts.
4. **Safeguards:**
   - **Export Limit:** Enforces a hard limit of 10,000 records per export. Requests exceeding this limit return a 400 Bad Request to prevent system exhaustion.

### **3.7 KPI Overview Dashboard**

1. **Trigger:** Authenticated administrative users request the KPI overview (GET /v1/dashboard/kpi).
2. **Optimization Logic:**
   - **Parallelism:** Executes all database aggregation queries (Total count, Average rating, Delta counts, Coverage) concurrently using \Promise.all\ to minimize response time.
   - **Layered Caching:** Implements a 60-second TTL cache using Cache Manager. The cache key is dynamically generated based on the user's role, geographic scope, target survey, and comparison parameters to ensure data isolation.
3. **Business Logic:**
   - **Delta Comparisons:** When \compareWithPreviousPeriod\ is enabled, the system calculates the percentage change in responses and raw difference in rating between the current month and the previous month.
   - **Geographic Coverage:** Tracks how many distinct provinces within the user's permissible scope have submitted at least one response compared to the total number of provinces in that scope.
esponseToday\ metric tracking submissions since 00:00 UTC of the current day.

### **3.8 Geographic Heatmap Dashboard**

1. **Trigger:** Authenticated administrative users request the geographic heatmap data (GET /v1/dashboard/geographic-heatmap).
2. **Dynamic Aggregation & Normalization:**
   - **Level Resolution:** Target aggregation level is dynamically resolved based on the requested level (region, province, district) and strictly bounded by the user's role (e.g. PROVINCE_ADMIN is locked to district).
   - **Color Intensity Normalization:** Maps each item's average satisfaction rating onto a normalized 0-1 scale relative to the minRating and maxRating within the same result set. Returns 0 for items without responses.
   - **Parent Mapping:** Automatically maps parent geographical entities (e.g., district items will map their parent province ID and name).
3. **Optimization Logic:**
   - **In-Memory Aggregation:** Fetches required nested relations in a single Prisma query and computes aggregations (total responses, average rating) in memory to avoid N+1 query issues.
   - **Caching:** Implements a 30-second TTL cache scoped by role, ID, and parameters to ensure fast dashboard rendering.

### **3.9 Satisfaction Trend Dashboard**

1. **Trigger:** Authenticated administrative users request the satisfaction trend data (GET /v1/dashboard/trend).
2. **Dynamic Time-Series Aggregation:**
   - **SQL-Based Grouping:** Uses PostgreSQL DATE_TRUNC within a raw Prisma query to group responses by day, week, or month.
   - **Scoping & Filtering:** Automatically filters by RBAC rules (Region/Province scope) and optionally by surveyId or a specific questionId.
   - **Series Continuity:** Application logic identifies gaps in the time-series (periods with 0 responses) and injects placeholder items with verageRating: null and 	otalResponses: 0 to ensure a continuous line chart for the frontend.
3. **Advanced Analytics:**
   - **Moving Average:** Computes a 3-period Simple Moving Average (SMA) in the application layer.
   - **Range Validation:** Enforces strict limits on requested date ranges (e.g., max 365 days for daily view) to prevent performance degradation.
4. **Caching:** Implements a 60-second TTL cache for fast recurring dashboard views.

### **3.10 Section & Question Scores Dashboard**

1. **Trigger:** Authenticated administrative users request the section and question scores (GET /v1/dashboard/section-scores).
2. **Aggregation Logic:**
   - **Rating Only:** Filters questions to only include those of type RATING.
   - **Hierarchical Grouping:** Data is grouped by SurveySection and then by Question.
   - **RBAC Scoping:** Main series scores are scoped based on the user's role (Region/Province).
3. **Comparison Feature:**
   - **Super Admin Only:** Allows a second data series (comparisonRating) by providing a compareProvinceId.
   - **Validation:** Attempts by non-SUPER_ADMIN users to use the comparison feature result in a 403 Forbidden error.
4. **Calculations:**
   - **Section Average:** Unweighted average of all RATING questions within the section.
   - **Overall Average:** Unweighted average of all section averages.
### 3.11 Role-scoped Filter Panel Endpoint
... (rest of 3.11 content)

### **3.12 Section Graph Data Aggregation**

1. **Trigger:** Authenticated administrative users request graph data for a specific survey section (GET /v1/reports/section-graph).
2. **Dynamic RBAC Data Scoping:**
   - **SUPER_ADMIN**: Scoped by optional geographic filters (`provinceId`, `districtId`, `villageId`).
   - **REGION_ADMIN**: Automatically scoped to their `regionId`. If a `provinceId` is provided, it is validated against their region.
   - **PROVINCE_ADMIN**: Strictly scoped to their `provinceId`.
3. **Data Aggregation Logic:**
   - **Targeting**: Only questions of type `RATING` within the specified `sectionId` are processed.
   - **Metrics**: Calculates the `averageScore` and `answerCount` for each rating question.
   - **Unique Scope**: Returns the `totalResponses` (unique survey submissions) that contribute to the current scoped view.
4. **Return Structure**: Optimized for frontend charting libraries, providing question text and calculated averages rounded to 2 decimal places.

