import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TipsController } from "./tips.controller";
import { TipsService } from "./tips.service";
import { Tip } from "../../common/entities/tip.entity";
import { Tipster } from "../../common/entities/tipster.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { User } from "../../common/entities/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, Tipster, TipSelection, MatchData, User]),
  ],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
