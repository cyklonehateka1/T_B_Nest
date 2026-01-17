import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LeaguesController } from "./leagues.controller";
import { LeaguesService } from "./leagues.service";
import { League } from "../../common/entities/league.entity";

@Module({
  imports: [TypeOrmModule.forFeature([League])],
  controllers: [LeaguesController],
  providers: [LeaguesService],
  exports: [LeaguesService],
})
export class LeaguesModule {}
