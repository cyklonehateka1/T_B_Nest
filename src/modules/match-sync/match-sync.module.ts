import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { MatchSyncService } from "./match-sync.service";
import { MatchSyncScheduler } from "./match-sync.scheduler";
import { TheOddsApiClientService } from "./services/the-odds-api-client.service";
import { MatchData } from "../../common/entities/match-data.entity";
import { Team } from "../../common/entities/team.entity";
import { League } from "../../common/entities/league.entity";
import { Provider } from "../../common/entities/provider.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchData, Team, League, Provider]),
    HttpModule,
  ],
  providers: [MatchSyncService, MatchSyncScheduler, TheOddsApiClientService],
  exports: [MatchSyncService, TheOddsApiClientService],
})
export class MatchSyncModule {}
