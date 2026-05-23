import 'dotenv/config';
import { PrismaClient, Role, QuestionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ProvinceJSON {
  province_id: number;
  province_name: string;
  province_code: string;
}

interface DistrictJSON {
  district_id: number;
  district_name: string;
  district_code: string;
  province_code: string;
}

interface VillageJSON {
  village_id: number;
  village_name: string;
  district_code: string;
}

async function main() {
  console.log('Start seeding...');

  // 1. Create Default Admin
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('Created Super Admin');

  // 1.5. Seed Customer Types
  console.log('Seeding Customer Types...');
  const customerTypes = [
    { name: 'RESIDENTIAL', description: 'ທີ່ຢູ່ອາໄສ' },
    { name: 'COMMERCIAL', description: 'ທຸລະກິດການຄ້າ' },
    { name: 'INDUSTRIAL', description: 'ອຸດສາຫະກຳ' },
    { name: 'GOVERNMENT', description: 'ພາກລັດ' },
    { name: 'OTHER', description: 'ອື່ນໆ' },
  ];

  for (const ct of customerTypes) {
    await prisma.customerType.upsert({
      where: { name: ct.name },
      update: { description: ct.description },
      create: ct,
    });
  }

  // 2. Import Geography Data from JSON
  const provincesData: ProvinceJSON[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../province.json'), 'utf8'),
  );
  const districtsData: DistrictJSON[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../district.json'), 'utf8'),
  );
  const villagesData: VillageJSON[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../village.json'), 'utf8'),
  );

  // Create a default region since the JSON doesn't have it
  const defaultRegion = await prisma.region.upsert({
    where: { id: 'default-region-id' },
    update: {},
    create: {
      id: 'default-region-id',
      name: 'Lao PDR',
    },
  });

  console.log('Importing Provinces...');
  const provinceMap = new Map<string, string>(); // map province_code to uuid
  for (const p of provincesData) {
    const province = await prisma.province.create({
      data: {
        name: p.province_name,
        regionId: defaultRegion.id,
      },
    });
    provinceMap.set(p.province_code, province.id);
  }

  console.log('Importing Districts...');
  const districtMap = new Map<string, string>(); // map district_code to uuid
  for (const d of districtsData) {
    const provinceId = provinceMap.get(d.province_code);
    if (provinceId) {
      const district = await prisma.district.create({
        data: {
          name: d.district_name,
          provinceId: provinceId,
        },
      });
      districtMap.set(d.district_code, district.id);
    }
  }

  console.log(`Importing ${villagesData.length} Villages... (this might take a while)`);
  // Use batch create for villages to improve performance
  const villageChunks: VillageJSON[][] = [];
  const chunkSize = 1000;
  for (let i = 0; i < villagesData.length; i += chunkSize) {
    villageChunks.push(villagesData.slice(i, i + chunkSize));
  }

  for (const chunk of villageChunks) {
    const data = chunk
      .map((v: VillageJSON) => {
        const districtId = districtMap.get(v.district_code);
        if (districtId) {
          return {
            name: v.village_name,
            districtId: districtId,
          };
        }
        return null;
      })
      .filter((v): v is { name: string; districtId: string } => v !== null);

    if (data.length > 0) {
      await prisma.village.createMany({
        data: data,
      });
    }
  }

  // 3. Sample Survey
  await prisma.survey.create({
    data: {
      title: 'Customer Satisfaction Survey 2026',
      description: 'Annual survey to measure EDL customer satisfaction across the country.',
      sections: {
        create: [
          {
            title: 'General Information',
            order: 1,
            questions: {
              create: [
                {
                  text: 'How long have you been an EDL customer?',
                  type: QuestionType.SINGLE_CHOICE,
                  order: 1,
                  options: {
                    create: [
                      { text: 'Less than 1 year', order: 1 },
                      { text: '1-5 years', order: 2 },
                      { text: 'More than 5 years', order: 3 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
