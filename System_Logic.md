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

* **SurveyResponse:** A single submission by a user. Contains geographic IDs, customer details (customerNo, customerTypeId), and links to the specific Survey.  
* **CustomerType:** A table containing categories of customers (e.g., RESIDENTIAL, COMMERCIAL). Each SurveyResponse must relate to one CustomerType. Management of CustomerTypes is restricted to SUPER_ADMIN.
* **Answer:** Individual answers tied to a SurveyResponse and a Question. Stores raw text/rating in value, or relates to specific QuestionOption(s) via AnswerOption.

## **3\. Workflows & Data Logic**

### 3.1 Public User Submission (No Authentication Required)

1. **Trigger:** User scans a QR code or clicks a link pointing to the active survey (GET /api/surveys/active).  
2. Form **Load:** The frontend loads the Survey, including nested SurveySection, Question, and QuestionOption where isActive \= true. It also fetches available **CustomerTypes** (GET /api/customer-types).
3. **Submission Payload:** The frontend sends a POST request containing:  
   * Customer Info: customerNo, customerType (UUID of the selected CustomerType).  
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
* **PROVINCE\_ADMIN:**  
  * *Access:* Must have a non-null provinceId in their User record (strictly validated on creation/update).
  * *Data Visibility:* Can only read SurveyResponse data where provinceId === Admin.provinceId