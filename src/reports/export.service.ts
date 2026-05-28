// src/reports/export.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
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

    // Check total count before fetching
    const totalCount = await this.prisma.surveyResponse.count({ where });
    if (totalCount > this.MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Export limit exceeded. Maximum ${this.MAX_EXPORT_LIMIT} records allowed, but found ${totalCount}. Please narrow your filters.`
      );
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // FIX: Use buffer-based ExcelJS.Workbook instead of stream.WorkbookWriter
      // WorkbookWriter streams data directly to the HTTP response which causes
      // the ZIP/OOXML structure to be corrupted when chunked-encoding is used.
      // Writing to a Buffer first guarantees a valid, complete file.
      // ──────────────────────────────────────────────────────────────────────
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "EDL Survey System";
      workbook.created = new Date();
      workbook.modified = new Date();

      const responseSheet = workbook.addWorksheet("Responses");
      const answerSheet = workbook.addWorksheet("Answers");

      // ── Styles ─────────────────────────────────────────────────────────────
      // "Phetsarath OT" is the standard Lao Unicode font. ExcelJS embeds the
      // font name into the XML; if the font is installed on the client machine,
      // Excel will render Lao characters correctly. Fallback: "Arial Unicode MS"
      const LAO_FONT = "Phetsarath OT";

      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: "FFFFFFFF" }, name: LAO_FONT, size: 11 },
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF3C3489" },
        },
        alignment: { horizontal: "center", vertical: "middle", wrapText: true },
        border: {
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        },
      };

      const dataStyle: Partial<ExcelJS.Style> = {
        font: { name: LAO_FONT, size: 11 },
        alignment: { vertical: "middle", wrapText: true },
      };

      // ── Sheet 1: Responses ─────────────────────────────────────────────────
      responseSheet.columns = [
        { header: "Response ID",          key: "id",                  width: 40 },
        { header: "Customer Number",      key: "customerNumber",      width: 20 },
        { header: "Customer Name",        key: "customerName",        width: 30 },
        { header: "Phone",                key: "customerPhoneNumber", width: 20 },
        { header: "Customer Type",        key: "customerType",        width: 20 },
        { header: "Province",             key: "province",            width: 20 },
        { header: "District",             key: "district",            width: 20 },
        { header: "Village",              key: "village",             width: 20 },
        { header: "Mono-phase Meters",    key: "monoPhase",           width: 20 },
        { header: "3-phase Meters",       key: "threePhase",          width: 20 },
        { header: "Transformers (100kVA)",key: "transformer",         width: 25 },
        { header: "Submitted At",         key: "submittedAt",         width: 25 },
      ];

      responseSheet.getRow(1).height = 22;
      responseSheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

      // ── Sheet 2: Answers ───────────────────────────────────────────────────
      answerSheet.columns = [
        { header: "Response ID",   key: "responseId",   width: 40 },
        { header: "Question Text", key: "questionText", width: 50 },
        { header: "Question Type", key: "type",         width: 20 },
        { header: "Answer Value",  key: "value",        width: 50 },
      ];

      answerSheet.getRow(1).height = 22;
      answerSheet.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

      // ── Fetch data in batches (cursor-based pagination) ────────────────────
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
            province:     { select: { name: true } },
            district:     { select: { name: true } },
            village:      { select: { name: true } },
            answers: {
              include: {
                question:        { select: { text: true, type: true } },
                selectedOptions: { include: { option: { select: { text: true } } } },
              },
            },
          },
        });

        if (responses.length === 0) break;

        for (const sr of responses) {
          const row = responseSheet.addRow({
            id:                  sr.id,
            customerNumber:      sr.customerNumber,
            customerName:        sr.customerName,
            customerPhoneNumber: sr.customerPhoneNumber || "N/A",
            customerType:        sr.customerType?.name ?? "",
            province:            sr.province?.name ?? "",
            district:            sr.district?.name ?? "",
            village:             sr.village?.name ?? "",
            monoPhase:           sr.monoPhaseMeterCount,
            threePhase:          sr.threePhaseMeterCount,
            transformer:         sr.transformer100kVA,
            submittedAt:         sr.submittedAt.toISOString(),
          });
          // Apply Lao-compatible font to every data cell
          row.eachCell((cell) => { cell.style = { ...dataStyle }; });

          totalMono  += sr.monoPhaseMeterCount;
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

            const ansRow = answerSheet.addRow({
              responseId:   sr.id,
              questionText: ans.question.text,
              type:         ans.question.type,
              value:        val,
            });
            ansRow.eachCell((cell) => { cell.style = { ...dataStyle }; });
          }
        }

        processedCount += responses.length;
        lastId = responses[responses.length - 1].id;
      }

      // ── Summary row ────────────────────────────────────────────────────────
      const summaryRow = responseSheet.addRow({
        customerName: "TOTAL SUMMARY",
        monoPhase:    totalMono,
        threePhase:   totalThree,
        transformer:  totalTrans,
      });
      summaryRow.font = { bold: true, name: LAO_FONT, size: 11 };
      summaryRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };

      // ── Write to Buffer & send ─────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `EDL_Satisfaction_Export_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Set Content-Length so the browser knows the exact file size —
      // this prevents any chunked-transfer issues that corrupt the ZIP structure.
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.byteLength);
      res.end(Buffer.from(buffer));

    } catch (error) {
      console.error("Excel Export Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate Excel export" });
      } else {
        res.end();
      }
    }
  }
}
