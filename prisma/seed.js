"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Start seeding...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
            name: 'System Administrator',
            role: client_1.Role.SUPER_ADMIN,
        },
    });
    console.log('Created Super Admin');
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
    const provincesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../province.json'), 'utf8'));
    const districtsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../district.json'), 'utf8'));
    const villagesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../village.json'), 'utf8'));
    const defaultRegion = await prisma.region.upsert({
        where: { id: 'default-region-id' },
        update: {},
        create: {
            id: 'default-region-id',
            name: 'Lao PDR',
        },
    });
    console.log('Importing Provinces...');
    const provinceMap = new Map();
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
    const districtMap = new Map();
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
    const villageChunks = [];
    const chunkSize = 1000;
    for (let i = 0; i < villagesData.length; i += chunkSize) {
        villageChunks.push(villagesData.slice(i, i + chunkSize));
    }
    for (const chunk of villageChunks) {
        const data = chunk
            .map((v) => {
            const districtId = districtMap.get(v.district_code);
            if (districtId) {
                return {
                    name: v.village_name,
                    districtId: districtId,
                };
            }
            return null;
        })
            .filter((v) => v !== null);
        if (data.length > 0) {
            await prisma.village.createMany({
                data: data,
            });
        }
    }
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
                                    type: client_1.QuestionType.SINGLE_CHOICE,
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
//# sourceMappingURL=seed.js.map