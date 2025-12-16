import { Controller, Delete, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('account')
@UseGuards(SupabaseAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Delete()
  deleteAccount(@CurrentUser() user: any) {
    return this.accountService.deleteAccount(user.userId);
  }
}

