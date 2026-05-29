// src/reports/export.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, Role, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ExportExcelQueryDto } from './dto/export-excel-query.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

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

    const totalCount = await this.prisma.surveyResponse.count({ where });
    if (totalCount > this.MAX_EXPORT_LIMIT) {
      throw new BadRequestException(
        `Export limit exceeded. Maximum ${this.MAX_EXPORT_LIMIT} records allowed, but found ${totalCount}. Please narrow your filters.`,
      );
    }

    // ── Fetch first batch to discover question columns ─────────────────────
    // We need to know all questions upfront to build column headers.
    // Pull distinct questions from the survey (ordered by section/question order).
    const questions = surveyId
      ? await this.prisma.question.findMany({
          where: { section: { surveyId } },
          orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
          select: { id: true, text: true, type: true },
        })
      : [];

    // ── Build workbook ─────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EDL Survey System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Responses');

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3C3489' },
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      },
    };

    // ── Static columns + dynamic question columns ──────────────────────────
    const staticColumns: Partial<ExcelJS.Column>[] = [
      { header: 'Customer Number', key: 'customerNumber', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 30 },
      { header: 'Phone', key: 'customerPhoneNumber', width: 20 },
      { header: 'Customer Type', key: 'customerType', width: 20 },
      { header: 'Province', key: 'province', width: 20 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Village', key: 'village', width: 20 },
      { header: 'Mono-phase Meters', key: 'monoPhase', width: 20 },
      { header: '3-phase Meters', key: 'threePhase', width: 20 },
      { header: 'Transformers (100kVA)', key: 'transformer', width: 25 },
      { header: 'Submitted At', key: 'submittedAt', width: 25 },
    ];

    const questionColumns: Partial<ExcelJS.Column>[] = questions.map((q) => ({
      header: q.text,
      key: `q_${q.id}`,
      width: 40,
    }));

    sheet.columns = [...staticColumns, ...questionColumns];

    sheet.getRow(1).height = 22;
    sheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // ── Fetch & write data in batches ──────────────────────────────────────
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
        orderBy: { id: 'asc' },
        include: {
          customerType: { select: { name: true } },
          province: { select: { name: true } },
          district: { select: { name: true } },
          village: { select: { name: true } },
          answers: {
            include: {
              question: { select: { id: true, type: true } },
              selectedOptions: {
                include: { option: { select: { text: true } } },
              },
            },
          },
        },
      });

      if (responses.length === 0) break;

      for (const sr of responses) {
        // Build a map of questionId → formatted answer value
        const answerMap: Record<string, string | number> = {};
        for (const ans of sr.answers) {
          let val: string | number = '';
          if (ans.question.type === QuestionType.RATING) {
            val = ans.ratingValue ?? '';
          } else if (ans.question.type === QuestionType.TEXT) {
            val = ans.textValue ?? '';
          } else {
            val = ans.selectedOptions.map((o: any) => o.option.text).join('; ');
          }
          answerMap[ans.question.id] = val;
        }

        // Build row object: static fields + one key per question
        const rowData: Record<string, any> = {
          customerNumber: sr.customerNumber,
          customerName: sr.customerName,
          customerPhoneNumber: sr.customerPhoneNumber || 'N/A',
          customerType: sr.customerType?.name ?? '',
          province: sr.province?.name ?? '',
          district: sr.district?.name ?? '',
          village: sr.village?.name ?? '',
          monoPhase: sr.monoPhaseMeterCount,
          threePhase: sr.threePhaseMeterCount,
          transformer: sr.transformer100kVA,
          submittedAt: sr.submittedAt.toISOString(),
        };

        for (const q of questions) {
          rowData[`q_${q.id}`] = answerMap[q.id] ?? '';
        }

        sheet.addRow(rowData);

        totalMono += sr.monoPhaseMeterCount;
        totalThree += sr.threePhaseMeterCount;
        totalTrans += sr.transformer100kVA;
      }

      processedCount += responses.length;
      lastId = responses[responses.length - 1].id;
    }

    // ── Summary row ────────────────────────────────────────────────────────
    const summaryRow = sheet.addRow({
      customerName: 'TOTAL SUMMARY',
      monoPhase: totalMono,
      threePhase: totalThree,
      transformer: totalTrans,
    });
    summaryRow.font = { bold: true, size: 11 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFEFEF' },
    };

    // ── Write buffer & respond ─────────────────────────────────────────────
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const nodeBuffer = Buffer.from(arrayBuffer);

    const filename = `EDL_Satisfaction_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', nodeBuffer.length);
    res.status(200).send(nodeBuffer);
  }
}
