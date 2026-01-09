
const { PrismaClient } = require('@prisma/client');

(async () => {
    const prisma = new PrismaClient();
    try {
        console.log("Removing is_default column from partners table...");

        // This command removes the column
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "chest"."partners"
            DROP COLUMN IF EXISTS "is_default";
        `);

        console.log("Column removed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await prisma.$disconnect();
    }
})();
