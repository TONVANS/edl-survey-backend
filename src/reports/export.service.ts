// src/reports/export.service.ts — updated with section grouping headers
import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, Role, QuestionType, MeterType } from '@prisma/client';
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
    const { surveyId, startDate, endDate, provinceId, districtId, customerTypeId } = query;

    const where: Prisma.SurveyResponseWhereInput = {};
    if (surveyId) where.surveyId = surveyId;

    if (user.role === Role.SUPER_ADMIN) {
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.REGION_ADMIN) {
      where.province = { regionId: user.regionId };
      if (provinceId) where.provinceId = provinceId;
    } else if (user.role === Role.PROVINCE_ADMIN) {
      where.provinceId = user.provinceId;
    }

    if (districtId) where.districtId = districtId;
    if (customerTypeId) where.customerTypeId = customerTypeId;

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

    // ── Fetch questions grouped by section ────────────────────────────────
    // Include section info so we can render section-grouping headers.
    const sections = surveyId
      ? await this.prisma.surveySection.findMany({
          where: { surveyId },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            questions: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, type: true },
            },
          },
        })
      : [];

    // Flat list of questions (preserving section order) used for columns & answer mapping
    const questions = sections.flatMap((s) => s.questions);

    // ── Build workbook ────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EDL Survey System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Responses');

    // ── Shared styles ─────────────────────────────────────────────────────
    const staticHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3C3489' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { bottom: { style: 'thin', color: { argb: 'FF2B2570' } } },
    };

    // Each section gets a slightly different shade so columns are visually grouped
    const sectionShades = [
      'FF1A5493', // section 1 — darker blue
      'FF0B3D7A', // section 2 — even darker
      'FF1B5E38', // section 3 — green tint
      'FF7A3B00', // section 4 — amber tint
    ];
    const sectionBgColors = [
      'FFBDD7EE', // section 1 header bg
      'FF9DC3E6', // section 2 header bg
      'FFA8D08D', // section 3 header bg
      'FFFFD966', // section 4 header bg
    ];

    const sectionHeaderStyle = (index: number): Partial<ExcelJS.Style> => ({
      font: {
        bold: true,
        color: { argb: index % 2 === 0 ? 'FF0C3D6B' : 'FF042C53' },
        size: 10,
      },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: sectionBgColors[index % sectionBgColors.length] },
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: false },
      border: { bottom: { style: 'thin', color: { argb: 'FF9DC3E6' } } },
    });

    const questionHeaderStyle = (index: number): Partial<ExcelJS.Style> => ({
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: sectionShades[index % sectionShades.length] },
      },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } },
    });

    // ── Define columns (no header — we write headers manually for 2-row effect) ──
    const STATIC_COUNT = 11; // number of static columns

    const staticColumns: Partial<ExcelJS.Column>[] = [
      { key: 'customerNumber', width: 20 },
      { key: 'customerName', width: 30 },
      { key: 'customerPhoneNumber', width: 20 },
      { key: 'customerType', width: 20 },
      { key: 'province', width: 20 },
      { key: 'district', width: 20 },
      { key: 'village', width: 20 },
      { key: 'monoPhase', width: 20 },
      { key: 'threePhase', width: 20 },
      { key: 'transformer', width: 25 },
      { key: 'submittedAt', width: 25 },
    ];

    const questionColumns: Partial<ExcelJS.Column>[] = questions.map((q) => ({
      key: `q_${q.id}`,
      width: 40,
    }));

    sheet.columns = [...staticColumns, ...questionColumns];

    // ── ROW 1: Section grouping header ────────────────────────────────────
    const sectionRow = sheet.addRow([]);
    sectionRow.height = 18;

    // Static columns span → merge into one labelled cell
    const staticLabels = [
      'Customer Number', 'Customer Name', 'Phone', 'Customer Type',
      'Province', 'District', 'Village',
      'Mono-phase Meters', '3-phase Meters', 'Transformers (100kVA)',
      'Submitted At',
    ];
    for (let i = 0; i < STATIC_COUNT; i++) {
      const cell = sectionRow.getCell(i + 1);
      cell.value = i === 0 ? 'ຂໍ້ມູນຜູ້ຊົມໃຊ້ ແລະ ສະຖານທີ່' : null;
      cell.style = staticHeaderStyle;
    }
    if (STATIC_COUNT > 1) {
      sheet.mergeCells(1, 1, 1, STATIC_COUNT);
    }

    // Section question spans
    let colCursor = STATIC_COUNT + 1;
    sections.forEach((section, sIdx) => {
      const qCount = section.questions.length;
      if (qCount === 0) return;

      const startCol = colCursor;
      const endCol = colCursor + qCount - 1;

      for (let c = startCol; c <= endCol; c++) {
        const cell = sectionRow.getCell(c);
        cell.value = c === startCol ? section.title : null;
        cell.style = sectionHeaderStyle(sIdx);
      }

      if (qCount > 1) {
        sheet.mergeCells(1, startCol, 1, endCol);
      }

      colCursor += qCount;
    });

    // ── ROW 2: Column headers ─────────────────────────────────────────────
    const headerRow = sheet.addRow([]);
    headerRow.height = 38;

    staticLabels.forEach((label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.style = staticHeaderStyle;
    });

    colCursor = STATIC_COUNT + 1;
    sections.forEach((section, sIdx) => {
      section.questions.forEach((q) => {
        const cell = headerRow.getCell(colCursor);
        cell.value = q.text;
        cell.style = questionHeaderStyle(sIdx);
        colCursor++;
      });
    });

    // ── Fetch & write data rows in batches ────────────────────────────────
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
          meters: {
            include: { meterSize: { select: { type: true, amps: true } } },
          },
          transformers: {
            include: { transformerSize: { select: { sizeKVA: true } } },
          },
        },
      });

      if (responses.length === 0) break;

      for (const sr of responses) {
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

        const transformersStr = sr.transformers?.length 
          ? sr.transformers.map((t: any) => `${t.transformerSize?.sizeKVA}kVA(x${t.quantity})`).join(', ')
          : '';

        const monoMetersCount = sr.meters
          ?.filter((m: any) => m.meterSize?.type === MeterType.MONO_PHASE)
          .reduce((acc: number, m: any) => acc + m.quantity, 0) || 0;

        const threeMetersCount = sr.meters
          ?.filter((m: any) => m.meterSize?.type === MeterType.THREE_PHASE)
          .reduce((acc: number, m: any) => acc + m.quantity, 0) || 0;

        const rowData: Record<string, any> = {
          customerNumber: sr.customerNumber,
          customerName: sr.customerName,
          customerPhoneNumber: sr.customerPhoneNumber || 'N/A',
          customerType: sr.customerType?.name ?? '',
          province: sr.province?.name ?? '',
          district: sr.district?.name ?? '',
          village: sr.village?.name ?? '',
          monoPhase: monoMetersCount,
          threePhase: threeMetersCount,
          transformer: transformersStr,
          submittedAt: sr.submittedAt.toISOString(),
        };

        for (const q of questions) {
          rowData[`q_${q.id}`] = answerMap[q.id] ?? '';
        }

        sheet.addRow(rowData);

        totalMono += monoMetersCount;
        totalThree += threeMetersCount;
        totalTrans += sr.transformers?.reduce((acc: number, t: any) => acc + t.quantity, 0) || 0;
      }

      processedCount += responses.length;
      lastId = responses[responses.length - 1].id;
    }

    // ── Summary row ───────────────────────────────────────────────────────
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

    // ── Stream to response ────────────────────────────────────────────────
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const nodeBuffer = Buffer.from(arrayBuffer);
    const filename = `EDL_Satisfaction_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', nodeBuffer.length);
    res.status(200).send(nodeBuffer);
  }
}