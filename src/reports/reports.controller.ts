// src/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards, Res } from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ReportsService } from "./reports.service";
import { ExportService } from "./export.service";
import { OverallSummaryQueryDto } from "./dto/overall-summary-query.dto";
import { OverallSummaryResponseDto } from "./dto/overall-summary-response.dto";
import { GeographicQueryDto } from "./dto/geographic-query.dto";
import { GeographicReportResponseDto } from "./dto/geographic-report-response.dto";
import { CustomerTypeAnalysisQueryDto } from "./dto/customer-type-analysis-query.dto";
import { CustomerTypeAnalysisResponseDto } from "./dto/customer-type-analysis-response.dto";
import { QuestionDetailQueryDto } from "./dto/question-detail-query.dto";
import { QuestionDetailResponseDto } from "./dto/question-detail-response.dto";
import { SectionGraphQueryDto } from "./dto/section-graph-query.dto";
import { SectionGraphResponseDto } from "./dto/section-graph-response.dto";
import { ExportExcelQueryDto } from "./dto/export-excel-query.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import * as express from "express";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
  ) {}

  @Get("overall-summary")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Overall Satisfaction Summary Report",
    description:
      "Calculates the total survey responses, overall average rating, rating distribution (1 to 5 stars), and section-by-section satisfaction summary.",
  })
  @ApiResponse({
    status: 200,
    description: "The overall satisfaction summary report was successfully compiled.",
    type: OverallSummaryResponseDto,
  })
  async getOverallSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OverallSummaryQueryDto,
  ): Promise<OverallSummaryResponseDto> {
    return this.reportsService.getOverallSummary(user, query);
  }

  @Get("geographic")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Geographic Breakdown Report",
    description:
      "Calculates total responses, average rating, and response growth across different geographic levels (Region, Province, District, Village). Scoped by user role.",
  })
  @ApiResponse({
    status: 200,
    description: "The geographic breakdown report was successfully compiled.",
    type: GeographicReportResponseDto,
  })
  async getGeographicBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GeographicQueryDto,
  ): Promise<GeographicReportResponseDto> {
    return this.reportsService.getGeographicBreakdown(user, query);
  }

  @Get("customer-type-analysis")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Customer Type Analysis Report",
    description:
      "Aggregates survey results by customer type, including satisfaction ratings and meter/transformer counts. Scoped by user role.",
  })
  @ApiResponse({
    status: 200,
    description: "The customer type analysis report was successfully compiled.",
    type: CustomerTypeAnalysisResponseDto,
  })
  async getCustomerTypeAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CustomerTypeAnalysisQueryDto,
  ): Promise<CustomerTypeAnalysisResponseDto> {
    return this.reportsService.getCustomerTypeAnalysis(user, query);
  }

  @Get("question-detail")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Question-level Detail Report",
    description:
      "Provides detailed analysis for each question, including answer counts, skipped counts, rating averages/distributions, and choice option breakdowns.",
  })
  @ApiResponse({
    status: 200,
    description: "The question-level detail report was successfully compiled.",
    type: QuestionDetailResponseDto,
  })
  async getQuestionDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuestionDetailQueryDto,
  ): Promise<QuestionDetailResponseDto> {
    return this.reportsService.getQuestionDetail(user, query);
  }

  @Get("section-graph")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Get Section Graph Data",
    description:
      "Aggregates data for RATING questions within a specific survey section for chart display. Scoped by user role and geographic filters.",
  })
  @ApiResponse({
    status: 200,
    description: "The section graph data was successfully compiled.",
    type: SectionGraphResponseDto,
  })
  async getSectionGraphData(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SectionGraphQueryDto,
  ): Promise<SectionGraphResponseDto> {
    return this.reportsService.getSectionGraphData(user, query);
  }

  @Get("export-excel")
  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @ApiOperation({
    summary: "Export Raw Data to Excel",
    description:
      "Generates an Excel file containing two sheets: Responses and Answers. Uses streaming for efficiency and enforces an export limit of 10,000 records.",
  })
  @ApiResponse({
    status: 200,
    description: "Excel file stream started.",
  })
  async exportExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportExcelQueryDto,
    @Res() res: express.Response,
  ): Promise<void> {
    try {
      await this.exportService.exportToExcel(user, query, res);
    } catch (error) {
      // If headers have already been sent (partial write), we can only end the stream
      if (res.headersSent) {
        res.end();
        return;
      }
      // Otherwise, propagate to NestJS exception filter
      throw error;
    }
  }
}
