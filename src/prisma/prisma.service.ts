import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        let url = process.env.DATABASE_URL || process.env.DIRECT_URL;
        if (url && !url.includes('pgbouncer=true')) {
            url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
        }

        super({
            datasources: {
                db: {
                    url,
                },
            },
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
