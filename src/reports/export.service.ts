import { Injectable, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { Prisma, Role, QuestionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { ExportExcelQueryDto } from "./dto/export-excel-query.dto";
import { Response } from "express";
import * as ExcelJS from "exceljs";

@Injectable()
export class ExportService {
  private readonly BATCH_SIZE = 500;
  private readonly MAX_EXPORT_LIMIT = 10000;

  constructor(private readonly prisma: PrismaService) {}

  async exportToExcel(
    user: AuthenticatedUser,
    query: ExportExcelQueryDto,
    res: Response,
  ): Promise<void> {
    const { surveyId, startDate, endDate, provinceId, districtId } = query;

    const where: Prisma.SurveyResponseWhereInput = {};
    if (surveyId) where.surveyId = surveyId;

    // RBAC Scoping
    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
    }

    if (districtId) where.districtId = districtId;

    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    // 1. Check total count before streaming
    const totalCount = await this.prisma.surveyResponse.count({ where });
    if (totalCount > this.MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Export limit exceeded. Maximum ${this.MAX_EXPORT_LIMIT} records allowed, but found ${totalCount}. Please narrow your filters.`
      );
    }

    const filename = `survey-export-${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    try {
      const responseSheet = workbook.addWorksheet("Responses");
      const answerSheet = workbook.addWorksheet("Answers");

      // Header styles
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3C3489" },
        },
        alignment: { horizontal: "center" },
      };

      // Define columns for Sheet 1
      responseSheet.columns = [
        { header: "Response ID", key: "id", width: 40 },
        { header: "Customer Number", key: "customerNumber", width: 20 },
        { header: "Customer Name", key: "customerName", width: 30 },
        { header: "Phone", key: "customerPhoneNumber", width: 20 },
        { header: "Customer Type", key: "customerType", width: 20 },
        { header: "Province", key: "province", width: 20 },
        { header: "District", key: "district", width: 20 },
        { header: "Village", key: "village", width: 20 },
        { header: "Mono-phase Meters", key: "monoPhase", width: 20 },
        { header: "3-phase Meters", key: "threePhase", width: 20 },
        { header: "Transformers (100kVA)", key: "transformer", width: 25 },
        { header: "Submitted At", key: "submittedAt", width: 25 },
      ];

      responseSheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Define columns for Sheet 2
      answerSheet.columns = [
        { header: "Response ID", key: "responseId", width: 40 },
        { header: "Question Text", key: "questionText", width: 50 },
        { header: "Question Type", key: "type", width: 20 },
        { header: "Answer Value", key: "value", width: 50 },
      ];

      answerSheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle;
      });

      let processedCount = 0;
      let lastId: string | undefined = undefined;

      let totalMono = 0;
      let totalThree = 0;
      let totalTrans = 0;

      while (processedCount < totalCount) {
        const responses: any[] = await this.prisma.surveyResponse.findMany({
          where,
          take: this.BATCH_SIZE,
          skip: lastId ? 1 : 0,
          cursor: lastId ? { id: lastId } : undefined,
          orderBy: { id: "asc" },
          include: {
            customerType: { select: { name: true } },
            province: { select: { name: true } },
            district: { select: { name: true } },
            village: { select: { name: true } },
            answers: {
              include: {
                question: { select: { text: true, type: true } },
                selectedOptions: { include: { option: { select: { text: true } } } },
              },
            },
          },
        });

        if (responses.length === 0) break;

        for (const sr of responses) {
          responseSheet.addRow({
            id: sr.id,
            customerNumber: sr.customerNumber,
            customerName: sr.customerName,
            customerPhoneNumber: sr.customerPhoneNumber || "N/A",
            customerType: sr.customerType.name,
            province: sr.province.name,
            district: sr.district.name,
            village: sr.village.name,
            monoPhase: sr.monoPhaseMeterCount,
            threePhase: sr.threePhaseMeterCount,
            transformer: sr.transformer100kVA,
            submittedAt: sr.submittedAt.toISOString(),
          }).commit();

          totalMono += sr.monoPhaseMeterCount;
          totalThree += sr.threePhaseMeterCount;
          totalTrans += sr.transformer100kVA;

          for (const ans of sr.answers) {
            let val: string | number = "";
            if (ans.question.type === QuestionType.RATING) {
              val = ans.ratingValue ?? "";
            } else if (ans.question.type === QuestionType.TEXT) {
              val = ans.textValue ?? "";
            } else {
              val = ans.selectedOptions.map((o: any) => o.option.text).join("; ");
            }

            answerSheet.addRow({
              responseId: sr.id,
              questionText: ans.question.text,
              type: ans.question.type,
              value: val,
            }).commit();
          }
        }

        processedCount += responses.length;
        lastId = responses[responses.length - 1].id;
      }

      // Summary row for Sheet 1
      const summaryRow = responseSheet.addRow({
        customerName: "TOTAL SUMMARY",
        monoPhase: totalMono,
        threePhase: totalThree,
        transformer: totalTrans,
      });
      summaryRow.font = { bold: true };
      summaryRow.commit();

      await workbook.commit();
    } catch (error) {
      console.error("Excel Export Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate Excel export" });
      }
      // If headers already sent, we can't do much but end the stream
      res.end();
    }
  }
}
