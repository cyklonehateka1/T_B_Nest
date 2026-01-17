import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { MatchData } from "../../common/entities/match-data.entity";
@Module({
  imports: [TypeOrmModule.forFeature([MatchData])],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
