import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  SelectQueryBuilder,
  FindOptionsWhere,
  LessThanOrEqual,
  ILike,
  And,
  Or,
  DataSource,
  In,
} from "typeorm";
import { Tip } from "../../common/entities/tip.entity";
import { TipStatusType } from "../../common/enums/tip-status-type.enum";
import { MatchStatusType } from "../../common/enums/match-status-type.enum";
import { TipResponseDto, TipsterBasicInfoDto } from "./dto/tip-response.dto";
import { TipsPageResponseDto } from "./dto/tips-page-response.dto";
import {
  TopTipsterDto,
  TopTipstersPageResponseDto,
} from "./dto/top-tipster-response.dto";
import { TipsterDetailsDto } from "./dto/tipster-details-response.dto";
import {
  TipsterTipsResponseDto,
  TipsterTipDto,
} from "./dto/tipster-tips-response.dto";
import {
  TipEditingResponseDto,
  TipSelectionEditingDto,
} from "./dto/tip-editing-response.dto";
import { CreateTipDto } from "./dto/create-tip.dto";
import { UpdateTipDto } from "./dto/update-tip.dto";
import { AddSelectionDto } from "./dto/add-selection.dto";
import { Tipster } from "../../common/entities/tipster.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { MatchData } from "../../common/entities/match-data.entity";
import { User } from "../../common/entities/user.entity";
import { PredictionType } from "../../common/enums/prediction-type.enum";
import { AppSettings } from "../../common/entities/app-settings.entity";
import { Purchase } from "../../common/entities/purchase.entity";
import { PurchaseStatusType } from "../../common/enums/purchase-status-type.enum";
import { PurchaseTipDto } from "./dto/purchase-tip.dto";
import { PurchaseTipResponseDto } from "./dto/purchase-tip-response.dto";
import { PaymentGatewayRegistryService } from "../payments/gateways/payment-gateway-registry.service";
import { CountryDetectionService } from "../../common/services/country-detection.service";
import { CountrySettings } from "../../common/entities/country-settings.entity";
import {
  Payment,
  PaymentStatus,
} from "../../common/entities/payment.entity";
import { PaymentType } from "../../common/enums/payment-type.enum";
import { GlobalPaymentMethod } from "../../common/entities/global-payment-method.entity";
import { PaymentGateway } from "../../common/entities/payment-gateway.entity";

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);
  private static readonly MIN_PRICE = 1.0;
  private static readonly MAX_PRICE = 100.0;
  private static readonly MAX_SELECTIONS = 50;

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Tipster)
    private readonly tipsterRepository: Repository<Tipster>,
    @InjectRepository(TipSelection)
    private readonly tipSelectionRepository: Repository<TipSelection>,
    @InjectRepository(MatchData)
    private readonly matchRepository: Repository<MatchData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(CountrySettings)
    private readonly countrySettingsRepository: Repository<CountrySettings>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(GlobalPaymentMethod)
    private readonly globalPaymentMethodRepository: Repository<GlobalPaymentMethod>,
    @InjectRepository(PaymentGateway)
    private readonly paymentGatewayRepository: Repository<PaymentGateway>,
    private readonly dataSource: DataSource,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistryService,
    private readonly countryDetectionService: CountryDetectionService,
  ) {}

  async getTips(
    keyword?: string,
    tipsterId?: string,
    minPrice?: number,
    maxPrice?: number,
    status?: string,
    isFree?: boolean,
    page: number = 0,
    size: number = 20,
  ): Promise<TipsPageResponseDto> {
    this.logger.debug(
      `Fetching tips with filters: keyword=${keyword}, tipsterId=${tipsterId}, minPrice=${minPrice}, maxPrice=${maxPrice}, status=${status}, isFree=${isFree}, page=${page}, size=${size}`,
    );

    let query = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.tipster", "tipster")
      .leftJoinAndSelect("tipster.user", "user")
      .where("tip.isPublished = :isPublished", { isPublished: true });

    if (keyword && keyword.trim() !== "") {
      const keywordPattern = `%${keyword.toLowerCase()}%`;
      query = query.andWhere(
        "(LOWER(tip.title) LIKE :keyword OR LOWER(tip.description) LIKE :keyword)",
        { keyword: keywordPattern },
      );
    }

    if (tipsterId) {
      query = query.andWhere("tipster.id = :tipsterId", { tipsterId });
    }

    if (isFree !== null && isFree !== undefined) {
      if (isFree) {
        query = query.andWhere("tip.price = :price", { price: 0 });
      } else {
        query = query.andWhere("tip.price > :price", { price: 0 });
      }
    } else {
      if (minPrice !== null && minPrice !== undefined) {
        query = query.andWhere("tip.price >= :minPrice", { minPrice });
      }
      if (maxPrice !== null && maxPrice !== undefined) {
        query = query.andWhere("tip.price <= :maxPrice", { maxPrice });
      }
    }

    if (status && status.trim() !== "") {
      try {
        const statusEnum =
          TipStatusType[status.toUpperCase() as keyof typeof TipStatusType];
        if (statusEnum) {
          query = query.andWhere("tip.status = :status", {
            status: statusEnum,
          });
        }
      } catch (error) {
        this.logger.debug(`Invalid status filter: ${status}`);
      }
    }

    const totalElements = await query.getCount();

    query = query
      .orderBy("tipster.rating", "DESC")
      .addOrderBy("tipster.successRate", "DESC")
      .addOrderBy("tip.publishedAt", "DESC")
      .addOrderBy("tip.createdAt", "DESC");

    const skip = page * size;
    query = query.skip(skip).take(size);

    const tips = await query.getMany();

    const tipResponses = tips.map((tip) => this.mapToResponse(tip));

    const freeTipsCount = await this.countFreeTips();

    const availableTipsCount = await this.countAvailableTips();

    const response: TipsPageResponseDto = {
      tips: tipResponses,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      currentPage: page,
      pageSize: size,
      freeTipsCount,
      availableTipsCount,
    };

    this.logger.log(
      `Retrieved ${tips.length} tips (page ${page}, total: ${totalElements})`,
    );
    return response;
  }

  private mapToResponse(tip: Tip): TipResponseDto {
    const response = new TipResponseDto();
    response.id = tip.id;
    response.title = tip.title;
    response.description = tip.description || null;
    response.price = parseFloat(tip.price.toString());
    response.totalOdds = tip.totalOdds
      ? parseFloat(tip.totalOdds.toString())
      : null;
    response.status = tip.status;
    response.purchasesCount = tip.purchasesCount;
    response.publishedAt = tip.publishedAt || null;
    response.earliestMatchDate = tip.earliestMatchDate || null;
    response.createdAt = tip.createdAt;
    response.isPublished = tip.isPublished;

    if (tip.tipster) {
      const tipsterInfo = new TipsterBasicInfoDto();
      tipsterInfo.id = tip.tipster.id;
      tipsterInfo.rating = parseFloat(tip.tipster.rating.toString());
      tipsterInfo.successRate = parseFloat(tip.tipster.successRate.toString());
      tipsterInfo.isVerified = tip.tipster.isVerified;
      tipsterInfo.totalTips = tip.tipster.totalTips;

      if (tip.tipster.user) {
        tipsterInfo.displayName =
          tip.tipster.user.displayName ||
          (tip.tipster.user.firstName || tip.tipster.user.lastName
            ? `${tip.tipster.user.firstName || ""} ${tip.tipster.user.lastName || ""}`.trim()
            : undefined);
        tipsterInfo.avatarUrl = tip.tipster.user.avatarUrl || null;
      }

      response.tipster = tipsterInfo;
    }

    return response;
  }

  async getMyTips(
    userId: string,
    page: number = 0,
    size: number = 20,
  ): Promise<TipsPageResponseDto> {
    this.logger.debug(
      `Fetching tips for user ${userId}, page=${page}, size=${size}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException("User not found or inactive");
    }

    const tipster = await this.tipsterRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!tipster) {
      return {
        tips: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: page,
        pageSize: size,
        freeTipsCount: 0,
        availableTipsCount: 0,
      };
    }

    let query = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.tipster", "tipster")
      .leftJoinAndSelect("tipster.user", "user")
      .where("tipster.id = :tipsterId", { tipsterId: tipster.id });

    const totalElements = await query.getCount();

    query = query.orderBy("tip.createdAt", "DESC");

    const skip = page * size;
    query = query.skip(skip).take(size);

    const tips = await query.getMany();

    const tipResponses = tips.map((tip) => this.mapToResponse(tip));

    const response: TipsPageResponseDto = {
      tips: tipResponses,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      currentPage: page,
      pageSize: size,
      freeTipsCount: 0,
      availableTipsCount: 0,
    };

    this.logger.log(
      `Retrieved ${tips.length} tips for user ${userId} (page ${page}, total: ${totalElements})`,
    );

    return response;
  }

  private async countFreeTips(): Promise<number> {
    return this.tipRepository.count({
      where: {
        isPublished: true,
        price: 0,
      } as FindOptionsWhere<Tip>,
    });
  }

  private async countAvailableTips(): Promise<number> {
    const now = new Date();

    const result = await this.tipRepository
      .createQueryBuilder("tip")
      .select("COUNT(DISTINCT tip.id)", "count")
      .where("tip.isPublished = :isPublished", { isPublished: true })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM tip_selections ts
          INNER JOIN match_data m ON ts.match_id = m.id
          WHERE ts.tip_id = tip.id
            AND (m.status != :scheduledStatus OR m.match_datetime <= :now)
        )`,
        {
          scheduledStatus: MatchStatusType.scheduled,
          now: now.toISOString(),
        },
      )
      .getRawOne<{ count: string }>();

    return result ? parseInt(result.count, 10) : 0;
  }

  async createTip(
    createTipDto: CreateTipDto,
    userId: string,
  ): Promise<TipResponseDto> {
    this.logger.debug(`Creating tip for user ${userId}: ${createTipDto.title}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        this.logger.warn(
          `User ${userId} attempted to create tip without TIPSTER role`,
        );
        throw new ForbiddenException("Only tipsters can create tips");
      }

      let tipster = await queryRunner.manager.findOne(Tipster, {
        where: { user: { id: userId } },
        relations: ["user"],
      });

      if (!tipster) {
        tipster = queryRunner.manager.create(Tipster, {
          user: { id: userId },
          isAi: false,
          isVerified: false,
          isActive: true,
          totalTips: 0,
          successfulTips: 0,
          totalEarnings: 0,
          successRate: 0,
          rating: 0,
        });
        tipster = await queryRunner.manager.save(Tipster, tipster);
        this.logger.log(`Created tipster record for user ${userId}`);
      }

      this.validateCreateTipDto(createTipDto);

      const tip = queryRunner.manager.create(Tip, {
        tipster: { id: tipster.id },
        isAi: false,
        title: createTipDto.title.trim(),
        description: createTipDto.description?.trim() || null,
        price: createTipDto.price,
        status: TipStatusType.PENDING,
        isPublished: false,
        purchasesCount: 0,
        totalRevenue: 0,
      });

      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;
      const selections: TipSelection[] = [];

      if (createTipDto.selections && createTipDto.selections.length > 0) {
        const matchIds = createTipDto.selections.map((s) => s.matchId);
        const uniqueMatchIds = [...new Set(matchIds)];

        if (uniqueMatchIds.length > TipsService.MAX_SELECTIONS) {
          throw new BadRequestException(
            `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`,
          );
        }

        const matches = await queryRunner.manager.find(MatchData, {
          where: uniqueMatchIds.map((id) => ({ id })),
        });

        if (matches.length !== uniqueMatchIds.length) {
          const foundIds = new Set(matches.map((m) => m.id));
          const missingIds = uniqueMatchIds.filter((id) => !foundIds.has(id));
          throw new NotFoundException(
            `Matches not found: ${missingIds.join(", ")}`,
          );
        }

        const now = new Date();
        const invalidMatches = matches.filter(
          (m) =>
            m.status !== MatchStatusType.scheduled || m.matchDatetime <= now,
        );

        if (invalidMatches.length > 0) {
          throw new BadRequestException(
            `Cannot create tip: ${invalidMatches.length} match(es) are not scheduled or have already started`,
          );
        }

        for (const match of matches) {
          if (!earliestMatchDate || match.matchDatetime < earliestMatchDate) {
            earliestMatchDate = match.matchDatetime;
          }
        }

        const selectionKeys = new Set<string>();

        for (const selectionDto of createTipDto.selections) {
          const match = matches.find((m) => m.id === selectionDto.matchId);
          if (!match) {
            throw new NotFoundException(
              `Match not found: ${selectionDto.matchId}`,
            );
          }

          const { predictionType, predictionValue } = this.mapPredictionString(
            selectionDto.prediction,
          );

          if (
            selectionDto.odds !== undefined &&
            selectionDto.odds !== null &&
            selectionDto.odds < 1.0
          ) {
            throw new BadRequestException(
              `Invalid odds for selection on match ${match.id}: odds must be at least 1.0 if provided`,
            );
          }

          const selectionKey = `${selectionDto.matchId}-${predictionType}-${predictionValue}`;
          if (selectionKeys.has(selectionKey)) {
            throw new BadRequestException(
              `Duplicate selection: match ${selectionDto.matchId} with prediction ${selectionDto.prediction}`,
            );
          }
          selectionKeys.add(selectionKey);

          const selection = queryRunner.manager.create(TipSelection, {
            tip: tip,
            match: match,
            predictionType: predictionType,
            predictionValue: predictionValue,
            odds: selectionDto.odds ?? undefined,
            isVoid: false,
          });

          selections.push(selection);

          if (selectionDto.odds && selectionDto.odds >= 1.0) {
            totalOdds *= selectionDto.odds;
          }
        }

        tip.totalOdds = totalOdds;
        tip.earliestMatchDate = earliestMatchDate;
      }

      const savedTip = await queryRunner.manager.save(Tip, tip);

      for (const selection of selections) {
        selection.tip = savedTip;
        await queryRunner.manager.save(TipSelection, selection);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully created tip ${savedTip.id} by user ${userId} with ${selections.length} selections`,
      );

      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: savedTip.id },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException(
          "Failed to retrieve created tip",
        );
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating tip: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to create tip");
    } finally {
      await queryRunner.release();
    }
  }

  private validateCreateTipDto(dto: CreateTipDto): void {
    if (!dto.title || typeof dto.title !== "string") {
      throw new BadRequestException("Title is required and must be a string");
    }

    const trimmedTitle = dto.title.trim();
    if (trimmedTitle.length === 0) {
      throw new BadRequestException("Title cannot be empty");
    }

    if (trimmedTitle.length > 255) {
      throw new BadRequestException("Title must not exceed 255 characters");
    }

    if (
      dto.price === null ||
      dto.price === undefined ||
      typeof dto.price !== "number"
    ) {
      throw new BadRequestException("Price is required and must be a number");
    }

    if (dto.price < 0) {
      throw new BadRequestException("Price must be at least 0");
    }

    if (dto.price > 0 && dto.price < TipsService.MIN_PRICE) {
      throw new BadRequestException(
        `Price must be at least ${TipsService.MIN_PRICE} USD for paid tips, or 0 for free tips`,
      );
    }

    if (dto.price > TipsService.MAX_PRICE) {
      throw new BadRequestException(
        `Price must not exceed ${TipsService.MAX_PRICE} USD`,
      );
    }

    if (dto.selections !== undefined) {
      if (!Array.isArray(dto.selections)) {
        throw new BadRequestException("Selections must be an array");
      }

      if (dto.selections.length > TipsService.MAX_SELECTIONS) {
        throw new BadRequestException(
          `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`,
        );
      }
    }

    for (let i = 0; i < dto.selections.length; i++) {
      const selection = dto.selections[i];
      if (!selection.matchId || typeof selection.matchId !== "string") {
        throw new BadRequestException(
          `Selection ${i + 1}: matchId is required and must be a string`,
        );
      }

      if (!selection.prediction || typeof selection.prediction !== "string") {
        throw new BadRequestException(
          `Selection ${i + 1}: prediction is required and must be a string`,
        );
      }

      if (selection.odds !== undefined && selection.odds !== null) {
        if (typeof selection.odds !== "number") {
          throw new BadRequestException(
            `Selection ${i + 1}: odds must be a number if provided`,
          );
        }

        if (selection.odds < 1.0) {
          throw new BadRequestException(
            `Selection ${i + 1}: odds must be at least 1.0 if provided`,
          );
        }

        if (selection.odds > 1000) {
          throw new BadRequestException(
            `Selection ${i + 1}: odds must not exceed 1000`,
          );
        }
      }
    }

    if (dto.description !== undefined && dto.description !== null) {
      if (typeof dto.description !== "string") {
        throw new BadRequestException("Description must be a string");
      }

      const maxDescriptionLength = 10000;
      if (dto.description.length > maxDescriptionLength) {
        throw new BadRequestException(
          `Description must not exceed ${maxDescriptionLength} characters`,
        );
      }
    }
  }

  private mapPredictionString(
    prediction: string,
    predictionValueFromDto?: string,
    betLine?: number,
  ): {
    predictionType: PredictionType;
    predictionValue: string;
  } {
    const normalized = prediction.toLowerCase().trim();

    if (normalized === "home_win" || normalized === "home") {
      return {
        predictionType: PredictionType.MATCH_RESULT,
        predictionValue: "home_win",
      };
    }
    if (normalized === "away_win" || normalized === "away") {
      return {
        predictionType: PredictionType.MATCH_RESULT,
        predictionValue: "away_win",
      };
    }
    if (normalized === "draw") {
      return {
        predictionType: PredictionType.MATCH_RESULT,
        predictionValue: "draw",
      };
    }

    const overUnderMatch = normalized.match(/^(over|under)[_\s]?(\d+\.?\d*)$/);
    if (overUnderMatch) {
      const direction = overUnderMatch[1];
      const line = overUnderMatch[2];
      return {
        predictionType: PredictionType.OVER_UNDER,
        predictionValue: `${direction}_${line}`,
      };
    }

    if (
      normalized === "btts_yes" ||
      normalized === "btts yes" ||
      normalized === "both_teams_yes"
    ) {
      return {
        predictionType: PredictionType.BOTH_TEAMS_TO_SCORE,
        predictionValue: "yes",
      };
    }
    if (
      normalized === "btts_no" ||
      normalized === "btts no" ||
      normalized === "both_teams_no"
    ) {
      return {
        predictionType: PredictionType.BOTH_TEAMS_TO_SCORE,
        predictionValue: "no",
      };
    }

    if (normalized === "home_draw" || normalized === "1x") {
      return {
        predictionType: PredictionType.DOUBLE_CHANCE,
        predictionValue: "home_draw",
      };
    }
    if (normalized === "home_away" || normalized === "12") {
      return {
        predictionType: PredictionType.DOUBLE_CHANCE,
        predictionValue: "home_away",
      };
    }
    if (normalized === "away_draw" || normalized === "x2") {
      return {
        predictionType: PredictionType.DOUBLE_CHANCE,
        predictionValue: "away_draw",
      };
    }

    if (normalized === "handicap" || normalized.includes("handicap")) {
      if (normalized === "handicap") {
        if (predictionValueFromDto) {
          return {
            predictionType: PredictionType.HANDICAP,
            predictionValue: predictionValueFromDto,
          };
        }

        if (betLine !== undefined) {
          const sign = betLine >= 0 ? "+" : "";
          return {
            predictionType: PredictionType.HANDICAP,
            predictionValue: `handicap_${sign}${betLine}`,
          };
        }
        return {
          predictionType: PredictionType.HANDICAP,
          predictionValue: "handicap",
        };
      }

      return {
        predictionType: PredictionType.HANDICAP,
        predictionValue: normalized,
      };
    }

    if (normalized.length > 100) {
      throw new BadRequestException(
        `Prediction value must not exceed 100 characters: ${prediction}`,
      );
    }

    if (normalized.startsWith("over_") || normalized.startsWith("under_")) {
      return {
        predictionType: PredictionType.OVER_UNDER,
        predictionValue: normalized,
      };
    }
    if (normalized.includes("btts") || normalized.includes("both_teams")) {
      return {
        predictionType: PredictionType.BOTH_TEAMS_TO_SCORE,
        predictionValue: normalized,
      };
    }
    if (
      normalized.includes("home_draw") ||
      normalized.includes("home_away") ||
      normalized.includes("away_draw")
    ) {
      return {
        predictionType: PredictionType.DOUBLE_CHANCE,
        predictionValue: normalized,
      };
    }
    if (normalized.includes("handicap")) {
      return {
        predictionType: PredictionType.HANDICAP,
        predictionValue: normalized,
      };
    }

    return {
      predictionType: PredictionType.MATCH_RESULT,
      predictionValue: normalized,
    };
  }

  async getTipForEditing(
    tipId: string,
    userId: string,
  ): Promise<TipEditingResponseDto> {
    this.logger.debug(
      `Getting tip ${tipId} for editing/viewing by user ${userId}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException("User not found or inactive");
    }

    const userRoles = await this.dataSource
      .createQueryBuilder()
      .from("user_roles", "ur")
      .where("ur.user_id = :userId", { userId })
      .getRawMany();

    const roles = userRoles.map((ur) => ur.role);
    const hasTipsterRole = roles.includes("TIPSTER");

    if (!hasTipsterRole) {
      throw new ForbiddenException("Only tipsters can view tips");
    }

    const tip = await this.tipRepository.findOne({
      where: { id: tipId },
      relations: ["tipster", "tipster.user"],
    });

    if (!tip) {
      throw new NotFoundException(`Tip not found: ${tipId}`);
    }

    if (tip.tipster.user?.id !== userId) {
      throw new ForbiddenException("You can only view your own tips");
    }

    const selections = await this.tipSelectionRepository.find({
      where: { tip: { id: tipId } },
      relations: ["match"],
    });

    const response = new TipEditingResponseDto();
    response.id = tip.id;
    response.title = tip.title;
    response.description = tip.description || null;
    response.price = parseFloat(tip.price.toString());
    response.totalOdds = tip.totalOdds
      ? parseFloat(tip.totalOdds.toString())
      : null;
    response.status = tip.status;
    response.purchasesCount = tip.purchasesCount;
    response.earliestMatchDate = tip.earliestMatchDate || null;
    response.createdAt = tip.createdAt;

    if (tip.tipster) {
      const tipsterInfo = new TipsterBasicInfoDto();
      tipsterInfo.id = tip.tipster.id;
      tipsterInfo.rating = parseFloat(tip.tipster.rating.toString());
      tipsterInfo.successRate = parseFloat(tip.tipster.successRate.toString());
      tipsterInfo.isVerified = tip.tipster.isVerified;
      tipsterInfo.totalTips = tip.tipster.totalTips;

      if (tip.tipster.user) {
        tipsterInfo.displayName =
          tip.tipster.user.displayName ||
          (tip.tipster.user.firstName || tip.tipster.user.lastName
            ? `${tip.tipster.user.firstName || ""} ${tip.tipster.user.lastName || ""}`.trim()
            : undefined);
        tipsterInfo.avatarUrl = tip.tipster.user.avatarUrl || null;
      }

      response.tipster = tipsterInfo;
    }

    response.selections = selections.map((sel) => {
      const selectionDto = new TipSelectionEditingDto();
      selectionDto.id = sel.id;
      selectionDto.matchId = sel.match.id;
      selectionDto.predictionType = sel.predictionType;
      selectionDto.predictionValue = sel.predictionValue;
      selectionDto.odds = sel.odds
        ? parseFloat(sel.odds.toString())
        : undefined;
      selectionDto.isVoid = sel.isVoid;
      return selectionDto;
    });

    return response;
  }

  async updateTip(
    tipId: string,
    updateTipDto: UpdateTipDto,
    userId: string,
  ): Promise<TipResponseDto> {
    this.logger.debug(`Updating tip ${tipId} by user ${userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        throw new ForbiddenException("Only tipsters can update tips");
      }

      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException("You can only update your own tips");
      }

      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot update tip: tip has already been published and is available for purchase",
        );
      }

      if (updateTipDto.title !== undefined) {
        const trimmedTitle = updateTipDto.title.trim();
        if (trimmedTitle.length === 0) {
          throw new BadRequestException("Title cannot be empty");
        }
        if (trimmedTitle.length > 255) {
          throw new BadRequestException("Title must not exceed 255 characters");
        }
        tip.title = trimmedTitle;
      }

      if (updateTipDto.description !== undefined) {
        tip.description = updateTipDto.description?.trim() || null;
      }

      if (updateTipDto.price !== undefined) {
        if (updateTipDto.price < 0) {
          throw new BadRequestException("Price must be at least 0");
        }
        if (
          updateTipDto.price > 0 &&
          updateTipDto.price < TipsService.MIN_PRICE
        ) {
          throw new BadRequestException(
            `Price must be at least ${TipsService.MIN_PRICE} USD for paid tips, or 0 for free tips`,
          );
        }
        if (updateTipDto.price > TipsService.MAX_PRICE) {
          throw new BadRequestException(
            `Price must not exceed ${TipsService.MAX_PRICE} USD`,
          );
        }
        tip.price = updateTipDto.price;
      }

      const updatedTip = await queryRunner.manager.save(Tip, tip);

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully updated tip ${tipId} by user ${userId}`);

      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: updatedTip.id },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException(
          "Failed to retrieve updated tip",
        );
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error updating tip: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to update tip");
    } finally {
      await queryRunner.release();
    }
  }

  async addSelection(
    tipId: string,
    addSelectionDto: AddSelectionDto,
    userId: string,
  ): Promise<TipResponseDto> {
    this.logger.debug(
      `Adding selection to tip ${tipId} by user ${userId}: match ${addSelectionDto.matchId}, prediction ${addSelectionDto.prediction}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        throw new ForbiddenException(
          "Only tipsters can add selections to tips",
        );
      }

      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      if (!tip.id || tip.id !== tipId) {
        throw new InternalServerErrorException(
          `Tip ID mismatch: expected ${tipId}, got ${tip.id}`,
        );
      }

      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException(
          "You can only add selections to your own tips",
        );
      }

      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot add selections: tip has already been published and is available for purchase",
        );
      }

      const match = await queryRunner.manager.findOne(MatchData, {
        where: { id: addSelectionDto.matchId },
      });

      if (!match) {
        throw new NotFoundException(
          `Match not found: ${addSelectionDto.matchId}`,
        );
      }

      const now = new Date();
      if (
        match.status !== MatchStatusType.scheduled ||
        match.matchDatetime <= now
      ) {
        throw new BadRequestException(
          "Cannot add selection: match is not scheduled or has already started",
        );
      }

      const { predictionType, predictionValue } = this.mapPredictionString(
        addSelectionDto.prediction,
        undefined,
        addSelectionDto.betLine,
      );

      if (addSelectionDto.odds !== undefined && addSelectionDto.odds !== null) {
        if (addSelectionDto.odds < 1.0) {
          throw new BadRequestException(
            "Odds must be at least 1.0 if provided",
          );
        }

        if (addSelectionDto.odds > 1000) {
          throw new BadRequestException("Odds must not exceed 1000");
        }
      }

      const existingSelection = await queryRunner.manager.findOne(
        TipSelection,
        {
          where: {
            tip: { id: tipId },
            match: { id: addSelectionDto.matchId },
            predictionType: predictionType,
            predictionValue: predictionValue,
          },
        },
      );

      const mutuallyExclusiveTypes = [
        PredictionType.MATCH_RESULT,
        PredictionType.DOUBLE_CHANCE,
        PredictionType.HANDICAP,
      ];

      const isMutuallyExclusiveType =
        mutuallyExclusiveTypes.includes(predictionType);

      let selectionToUpdate: TipSelection | null = null;

      if (isMutuallyExclusiveType) {
        const existingMutuallyExclusiveSelection =
          await queryRunner.manager.findOne(TipSelection, {
            where: {
              tip: { id: tipId },
              match: { id: addSelectionDto.matchId },
              predictionType: In(mutuallyExclusiveTypes),
            },
          });

        if (existingMutuallyExclusiveSelection) {
          if (
            existingMutuallyExclusiveSelection.predictionType ===
              predictionType &&
            existingMutuallyExclusiveSelection.predictionValue ===
              predictionValue
          ) {
            selectionToUpdate = existingMutuallyExclusiveSelection;
          } else {
            selectionToUpdate = existingMutuallyExclusiveSelection;
          }
        }
      }

      if (existingSelection) {
        await queryRunner.manager.delete(TipSelection, {
          id: existingSelection.id,
        });

        const allSelections = await queryRunner.manager.find(TipSelection, {
          where: { tip: { id: tipId } },
          relations: ["match"],
        });

        let totalOdds = 1.0;
        let earliestMatchDate: Date | null = null;

        for (const sel of allSelections) {
          if (sel.odds && sel.odds >= 1.0) {
            totalOdds *= sel.odds;
          }
          if (sel.match && sel.match.matchDatetime) {
            if (
              !earliestMatchDate ||
              sel.match.matchDatetime < earliestMatchDate
            ) {
              earliestMatchDate = sel.match.matchDatetime;
            }
          }
        }

        await queryRunner.manager.query(
          `UPDATE tips
           SET total_odds = $1, earliest_match_date = $2, updated_at = NOW()
           WHERE id = $3::uuid`,
          [
            totalOdds > 1.0 ? totalOdds : null,
            earliestMatchDate || null,
            tipId,
          ],
        );

        await queryRunner.commitTransaction();

        const tipWithRelations = await this.tipRepository.findOne({
          where: { id: tipId },
          relations: ["tipster", "tipster.user"],
        });

        if (!tipWithRelations) {
          throw new InternalServerErrorException(
            "Failed to retrieve updated tip",
          );
        }

        return this.mapToResponse(tipWithRelations);
      }

      if (selectionToUpdate) {
        await queryRunner.manager.query(
          `UPDATE tip_selections
           SET prediction_type = $1::prediction_type,
               prediction_value = $2,
               odds = $3,
               updated_at = NOW()
           WHERE id = $4::uuid`,
          [
            predictionType,
            predictionValue,
            addSelectionDto.odds ?? null,
            selectionToUpdate.id,
          ],
        );

        const allSelections = await queryRunner.manager.find(TipSelection, {
          where: { tip: { id: tipId } },
          relations: ["match"],
        });

        let totalOdds = 1.0;
        let earliestMatchDate: Date | null = null;

        for (const sel of allSelections) {
          if (sel.odds && sel.odds >= 1.0) {
            totalOdds *= sel.odds;
          }
          if (sel.match && sel.match.matchDatetime) {
            if (
              !earliestMatchDate ||
              sel.match.matchDatetime < earliestMatchDate
            ) {
              earliestMatchDate = sel.match.matchDatetime;
            }
          }
        }

        await queryRunner.manager.query(
          `UPDATE tips
           SET total_odds = $1, earliest_match_date = $2, updated_at = NOW()
           WHERE id = $3::uuid`,
          [
            totalOdds > 1.0 ? totalOdds : null,
            earliestMatchDate || null,
            tipId,
          ],
        );

        await queryRunner.commitTransaction();

        const tipWithRelations = await this.tipRepository.findOne({
          where: { id: tipId },
          relations: ["tipster", "tipster.user"],
        });

        if (!tipWithRelations) {
          throw new InternalServerErrorException(
            "Failed to retrieve updated tip",
          );
        }

        return this.mapToResponse(tipWithRelations);
      }

      const currentSelectionsCount = await queryRunner.manager.count(
        TipSelection,
        {
          where: { tip: { id: tipId } },
        },
      );

      if (currentSelectionsCount >= TipsService.MAX_SELECTIONS) {
        throw new BadRequestException(
          `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`,
        );
      }

      this.logger.debug(
        `Inserting selection: tipId=${tipId}, matchId=${addSelectionDto.matchId}, predictionType=${predictionType}, predictionValue=${predictionValue}`,
      );

      if (!tipId || tipId.trim() === "") {
        throw new InternalServerErrorException(
          `Invalid tipId: ${tipId}. Cannot create selection.`,
        );
      }

      const insertResult = await queryRunner.manager.query(
        `INSERT INTO tip_selections (tip_id, match_id, prediction_type, prediction_value, odds, is_void, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::prediction_type, $4, $5, $6, NOW(), NOW()) RETURNING id`,
        [
          tipId,
          addSelectionDto.matchId,
          predictionType,
          predictionValue,
          addSelectionDto.odds ?? null,
          false,
        ],
      );

      if (!insertResult || insertResult.length === 0) {
        throw new InternalServerErrorException(
          "Failed to create selection: no ID returned",
        );
      }

      this.logger.debug(
        `Successfully inserted selection with ID: ${insertResult[0]?.id}`,
      );

      const allSelections = await queryRunner.manager.find(TipSelection, {
        where: { tip: { id: tipId } },
        relations: ["match"],
      });

      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;

      for (const sel of allSelections) {
        totalOdds *= sel.odds || 1.0;
        if (sel.match && sel.match.matchDatetime) {
          if (
            !earliestMatchDate ||
            sel.match.matchDatetime < earliestMatchDate
          ) {
            earliestMatchDate = sel.match.matchDatetime;
          }
        }
      }

      const totalOddsValue = totalOdds > 1.0 ? totalOdds : null;
      const earliestMatchDateValue = earliestMatchDate || null;

      await queryRunner.manager.query(
        `UPDATE tips
         SET total_odds = $1, earliest_match_date = $2, updated_at = NOW()
         WHERE id = $3::uuid`,
        [totalOddsValue, earliestMatchDateValue, tipId],
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully added selection to tip ${tipId} by user ${userId}`,
      );

      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException(
          "Failed to retrieve updated tip",
        );
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error adding selection: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to add selection");
    } finally {
      await queryRunner.release();
    }
  }

  async removeSelection(
    tipId: string,
    selectionId: string,
    userId: string,
  ): Promise<TipResponseDto> {
    this.logger.debug(
      `Removing selection ${selectionId} from tip ${tipId} by user ${userId}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        throw new ForbiddenException(
          "Only tipsters can remove selections from tips",
        );
      }

      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException(
          "You can only remove selections from your own tips",
        );
      }

      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot remove selections: tip has already been published and is available for purchase",
        );
      }

      const selection = await queryRunner.manager.findOne(TipSelection, {
        where: { id: selectionId, tip: { id: tipId } },
      });

      if (!selection) {
        throw new NotFoundException(
          `Selection not found: ${selectionId} or does not belong to tip ${tipId}`,
        );
      }

      await queryRunner.manager.remove(TipSelection, selection);

      const allSelections = await queryRunner.manager.find(TipSelection, {
        where: { tip: { id: tipId } },
        relations: ["match"],
      });

      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;

      for (const sel of allSelections) {
        totalOdds *= sel.odds || 1.0;
        if (sel.match && sel.match.matchDatetime) {
          if (
            !earliestMatchDate ||
            sel.match.matchDatetime < earliestMatchDate
          ) {
            earliestMatchDate = sel.match.matchDatetime;
          }
        }
      }

      tip.totalOdds =
        allSelections.length > 0 && totalOdds > 1.0 ? totalOdds : null;
      tip.earliestMatchDate = earliestMatchDate;

      await queryRunner.manager.save(Tip, tip);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully removed selection ${selectionId} from tip ${tipId} by user ${userId}`,
      );

      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException(
          "Failed to retrieve updated tip",
        );
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error removing selection: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to remove selection");
    } finally {
      await queryRunner.release();
    }
  }

  async publishTip(tipId: string, userId: string): Promise<TipResponseDto> {
    this.logger.debug(`Publishing tip ${tipId} by user ${userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        this.logger.warn(
          `User ${userId} attempted to publish tip without TIPSTER role`,
        );
        throw new ForbiddenException("Only tipsters can publish tips");
      }

      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException("You can only publish your own tips");
      }

      // Check if tipster has bank account details set (required for receiving funds)
      if (
        !user.accountNumber ||
        !user.accountName ||
        !user.bankCode ||
        !user.bankName
      ) {
        throw new BadRequestException(
          "Cannot publish tip: Please set your bank account details first. You need account number, account name, bank code, and bank name to receive funds when your tips succeed.",
        );
      }

      if (tip.isPublished) {
        throw new BadRequestException(
          "Tip is already published and available for purchase",
        );
      }

      if (!tip.title || tip.title.trim().length === 0) {
        throw new BadRequestException("Tip title is required");
      }

      if (tip.title.trim().length > 255) {
        throw new BadRequestException(
          "Tip title must not exceed 255 characters",
        );
      }

      const appSettings = await queryRunner.manager.findOne(AppSettings, {
        where: { isActive: true },
        order: { updatedAt: "DESC" },
      });

      const minPrice = appSettings
        ? parseFloat(appSettings.tipMinPrice.toString())
        : TipsService.MIN_PRICE;
      const maxPrice = appSettings
        ? parseFloat(appSettings.tipMaxPrice.toString())
        : TipsService.MAX_PRICE;
      const enableFreeTips = appSettings ? appSettings.enableFreeTips : true;

      if (tip.price < 0) {
        throw new BadRequestException("Price must be at least 0");
      }

      if (tip.price > 0 && tip.price < minPrice) {
        throw new BadRequestException(
          `Price must be at least ${minPrice} USD for paid tips, or 0 for free tips`,
        );
      }

      if (tip.price > maxPrice) {
        throw new BadRequestException(`Price must not exceed ${maxPrice} USD`);
      }

      if (tip.price === 0 && !enableFreeTips) {
        throw new BadRequestException(
          "Free tips are currently disabled. Please set a price for your tip.",
        );
      }

      const selections = await queryRunner.manager.find(TipSelection, {
        where: { tip: { id: tipId } },
        relations: ["match"],
      });

      if (!selections || selections.length === 0) {
        throw new BadRequestException(
          "Cannot publish tip: at least one selection is required",
        );
      }

      const matchIds = selections.map((s) => s.match.id);
      const uniqueMatchIds = [...new Set(matchIds)];

      const matches = await queryRunner.manager.find(MatchData, {
        where: uniqueMatchIds.map((id) => ({ id })),
      });

      if (matches.length !== uniqueMatchIds.length) {
        const foundIds = new Set(matches.map((m) => m.id));
        const missingIds = uniqueMatchIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Matches not found: ${missingIds.join(", ")}`,
        );
      }

      const now = new Date();
      const twelveHoursInMs = 12 * 60 * 60 * 1000;

      const invalidMatches: Array<{ matchId: string; matchDatetime: Date }> =
        [];

      for (const match of matches) {
        if (match.status !== MatchStatusType.scheduled) {
          throw new BadRequestException(
            `Cannot publish tip: match ${match.id} is not scheduled (status: ${match.status})`,
          );
        }

        if (match.matchDatetime <= now) {
          throw new BadRequestException(
            `Cannot publish tip: match ${match.id} has already started`,
          );
        }

        const timeUntilMatch = match.matchDatetime.getTime() - now.getTime();
        if (timeUntilMatch < twelveHoursInMs) {
          invalidMatches.push({
            matchId: match.id,
            matchDatetime: match.matchDatetime,
          });
        }
      }

      if (invalidMatches.length > 0) {
        const matchDetails = invalidMatches
          .map(
            (m) =>
              `match ${m.matchId} (starts at ${m.matchDatetime.toISOString()})`,
          )
          .join(", ");
        throw new BadRequestException(
          `Cannot publish tip: ${invalidMatches.length} match(es) are less than 12 hours before their start time: ${matchDetails}`,
        );
      }

      tip.isPublished = true;
      tip.publishedAt = new Date();
      tip.status = TipStatusType.PENDING;

      const publishedTip = await queryRunner.manager.save(Tip, tip);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully published tip ${tipId} by user ${userId} with ${selections.length} selections`,
      );

      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: publishedTip.id },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException(
          "Failed to retrieve published tip",
        );
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error publishing tip: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to publish tip");
    } finally {
      await queryRunner.release();
    }
  }

  async getTipDetails(
    tipId: string,
    userId: string,
  ): Promise<TipEditingResponseDto> {
    this.logger.debug(`Getting tip details for tip ${tipId} by user ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException("User not found or inactive");
    }

    const tip = await this.tipRepository.findOne({
      where: { id: tipId },
      relations: ["tipster", "tipster.user"],
    });

    if (!tip) {
      throw new NotFoundException(`Tip not found: ${tipId}`);
    }

    const isCreator = tip.tipster?.user?.id === userId;

    let hasPurchased = false;
    if (!isCreator) {
      const purchase = await this.purchaseRepository.findOne({
        where: {
          tip: { id: tipId },
          buyer: { id: userId },
          status: PurchaseStatusType.COMPLETED,
        },
      });
      hasPurchased = !!purchase;
    }

    if (!isCreator && !hasPurchased) {
      if (tip.price !== 0 || !tip.isPublished) {
        throw new ForbiddenException(
          "You do not have access to this tip. Please purchase it to view details.",
        );
      }
    }

    const selections = await this.tipSelectionRepository.find({
      where: { tip: { id: tipId } },
      relations: ["match"],
    });

    const response = new TipEditingResponseDto();
    response.id = tip.id;
    response.title = tip.title;
    response.description = tip.description || null;
    response.price = parseFloat(tip.price.toString());
    response.totalOdds = tip.totalOdds
      ? parseFloat(tip.totalOdds.toString())
      : null;
    response.status = tip.status;
    response.purchasesCount = tip.purchasesCount;
    response.earliestMatchDate = tip.earliestMatchDate || null;
    response.createdAt = tip.createdAt;

    if (tip.tipster) {
      const tipsterInfo = new TipsterBasicInfoDto();
      tipsterInfo.id = tip.tipster.id;
      tipsterInfo.rating = parseFloat(tip.tipster.rating.toString());
      tipsterInfo.successRate = parseFloat(tip.tipster.successRate.toString());
      tipsterInfo.isVerified = tip.tipster.isVerified;
      tipsterInfo.totalTips = tip.tipster.totalTips;

      if (tip.tipster.user) {
        tipsterInfo.displayName =
          tip.tipster.user.displayName ||
          (tip.tipster.user.firstName || tip.tipster.user.lastName
            ? `${tip.tipster.user.firstName || ""} ${tip.tipster.user.lastName || ""}`.trim()
            : undefined);
        tipsterInfo.avatarUrl = tip.tipster.user.avatarUrl || null;
      }

      response.tipster = tipsterInfo;
    }

    response.selections = selections.map((sel) => {
      const selectionDto = new TipSelectionEditingDto();
      selectionDto.id = sel.id;
      selectionDto.matchId = sel.match.id;
      selectionDto.predictionType = sel.predictionType;
      selectionDto.predictionValue = sel.predictionValue;
      selectionDto.odds = sel.odds
        ? parseFloat(sel.odds.toString())
        : undefined;
      selectionDto.isVoid = sel.isVoid;
      return selectionDto;
    });

    this.logger.log(
      `Successfully retrieved tip details for tip ${tipId} by user ${userId} (creator: ${isCreator}, purchased: ${hasPurchased})`,
    );

    return response;
  }

  async purchaseTip(
    tipId: string,
    userId: string,
    purchaseDto: PurchaseTipDto,
    ipAddress: string,
  ): Promise<PurchaseTipResponseDto> {
    this.logger.debug(
      `User ${userId} attempting to purchase tip ${tipId} with payment method ${purchaseDto.paymentMethod}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transactionCommitted = false;

    try {
      // Get buyer
      const buyer = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!buyer || !buyer.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      // Check if buyer has bank account details set (required for escrow refunds)
      if (
        !buyer.accountNumber ||
        !buyer.accountName ||
        !buyer.bankCode ||
        !buyer.bankName
      ) {
        throw new BadRequestException(
          "Cannot purchase tip: Please set your bank account details first. You need account number, account name, bank code, and bank name to receive refunds when tips fail.",
        );
      }

      // Get tip with tipster
      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      // Check if tip is published
      if (!tip.isPublished) {
        throw new BadRequestException(
          "Cannot purchase tip: Tip is not published yet",
        );
      }

      // Check if tipster has bank account details set (required for receiving funds)
      if (
        !tip.tipster.user ||
        !tip.tipster.user.accountNumber ||
        !tip.tipster.user.accountName ||
        !tip.tipster.user.bankCode ||
        !tip.tipster.user.bankName
      ) {
        throw new BadRequestException(
          "Cannot purchase tip: The tipster has not set their bank account details. Please contact support.",
        );
      }

      // Check if user is trying to buy their own tip
      if (tip.tipster.user.id === userId) {
        throw new BadRequestException(
          "Cannot purchase tip: You cannot purchase your own tip",
        );
      }

      // Check if user has already purchased this tip
      const existingPurchase = await queryRunner.manager.findOne(Purchase, {
        where: {
          tip: { id: tipId },
          buyer: { id: userId },
        },
      });

      if (existingPurchase) {
        if (existingPurchase.status === PurchaseStatusType.COMPLETED) {
          throw new BadRequestException("You have already purchased this tip");
        } else if (existingPurchase.status === PurchaseStatusType.PENDING) {
          throw new BadRequestException(
            "You already have a pending purchase for this tip",
          );
        } else if (existingPurchase.status === PurchaseStatusType.FAILED) {
          // Allow retry for failed purchases - delete the failed purchase record
          await queryRunner.manager.delete(Purchase, {
            id: existingPurchase.id,
          });
          this.logger.debug(
            `Deleted failed purchase ${existingPurchase.id} for tip ${tipId} by user ${userId}`,
          );
        }
      }

      // Detect country from IP address
      const countryDetection = await this.countryDetectionService.detectCountryFromIP(
        ipAddress,
      );

      // Get country settings from database
      const countrySettings = await queryRunner.manager.findOne(
        CountrySettings,
        {
          where: { countryCode: countryDetection.countryCode },
        },
      );

      if (!countrySettings) {
        throw new BadRequestException(
          `Payment is not available for your country (${countryDetection.countryCode}). Please contact support.`,
        );
      }

      // Validate that country settings have currency and conversion rate
      if (
        !countrySettings.localCurrencyCode ||
        !countrySettings.localCurrencyToUsdRate
      ) {
        throw new BadRequestException(
          `Currency settings are not configured for your country. Please contact support.`,
        );
      }

      // Convert USD amount to local currency
      // The localCurrencyToUsdRate appears to be stored as "USD to local" 
      // (how many local currency units per 1 USD), despite the entity comment.
      // Example: If rate = 10.8, then 1 USD = 10.8 GHS
      // So to convert USD to local: localCurrency = USD * rate
      const usdAmount = parseFloat(tip.price.toString());
      const localCurrencyAmount =
        usdAmount * countrySettings.localCurrencyToUsdRate;
      const localCurrencyCode = countrySettings.localCurrencyCode;

      this.logger.debug(
        `Converting ${usdAmount} USD to ${localCurrencyAmount} ${localCurrencyCode} for country ${countryDetection.countryCode}`,
      );

      // Get payment gateway (default to palmpay if not specified)
      const gatewayId = purchaseDto.paymentGateway || "palmpay";
      const paymentMethod = purchaseDto.paymentMethod || "mobile_money";

      // Check if gateway is available
      if (!this.paymentGatewayRegistry.isGatewayAvailable(gatewayId)) {
        throw new BadRequestException(
          `Payment gateway ${gatewayId} is not available`,
        );
      }

      // Generate purchase reference
      const purchaseReference = `TIP-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;
      const paymentId = `PAY-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;

      // Create purchase record (store converted amount in local currency)
      const purchase = queryRunner.manager.create(Purchase, {
        tip: tip,
        buyer: buyer,
        amount: localCurrencyAmount,
        status: PurchaseStatusType.PENDING,
        paymentMethod: paymentMethod,
        paymentGateway: gatewayId,
        purchasedAt: new Date(),
      });

      const savedPurchase = await queryRunner.manager.save(Purchase, purchase);

      // Initiate payment
      try {
        const paymentRequest = {
          paymentId: paymentId,
          amount: localCurrencyAmount,
          currency: localCurrencyCode,
          orderNumber: purchaseReference,
          paymentReference: purchaseReference,
          paymentMethod: paymentMethod,
          additionalData: {
            tipId: tip.id,
            tipTitle: tip.title,
            buyerId: buyer.id,
            tipsterId: tip.tipster.id,
          },
        };

        // Get GlobalPaymentMethod and PaymentGateway entities for Payment record
        // The paymentMethod should match the GlobalPaymentMethodType enum (e.g., "mobile_money")
        const globalPaymentMethod = await queryRunner.manager.findOne(
          GlobalPaymentMethod,
          {
            where: { type: paymentMethod as any },
          },
        );

        if (!globalPaymentMethod) {
          throw new BadRequestException(
            `Payment method ${paymentMethod} not found`,
          );
        }

        const paymentGateway = await queryRunner.manager.findOne(
          PaymentGateway,
          {
            where: [{ id: gatewayId }, { name: gatewayId }],
          },
        );

        if (!paymentGateway) {
          throw new BadRequestException(
            `Payment gateway ${gatewayId} not found`,
          );
        }

        // Create Payment entity to track the actual payment gateway interaction
        const payment = queryRunner.manager.create(Payment, {
          type: PaymentType.TIP_PURCHASE,
          purchase: savedPurchase,
          purchaseId: savedPurchase.id,
          orderNumber: purchaseReference,
          amount: localCurrencyAmount,
          globalPaymentMethod: globalPaymentMethod,
          globalPaymentMethodId: globalPaymentMethod.id,
          status: PaymentStatus.PENDING,
          paymentReference: purchaseReference,
          paymentGateway: paymentGateway,
          paymentGatewayId: paymentGateway.id,
          currency: localCurrencyCode,
          checkoutUrl: null, // Will be updated after payment initiation
          responseData: null, // Will store payment gateway response
        });

        // Initiate payment with gateway
        const paymentResponse =
          await this.paymentGatewayRegistry.initiatePayment(
            gatewayId,
            paymentRequest,
          );

        // Update payment with gateway response
        payment.providerTransactionId = paymentResponse.transactionId;
        payment.checkoutUrl = paymentResponse.checkoutUrl;
        payment.responseData = {
          success: true,
          message: paymentResponse.message || "Payment initiated successfully",
          transactionId: paymentResponse.transactionId,
          data: {
            checkoutUrl: paymentResponse.checkoutUrl,
            transactionId: paymentResponse.transactionId,
          },
        };

        // Save payment entity
        const savedPayment = await queryRunner.manager.save(Payment, payment);

        // Update purchase with payment details
        savedPurchase.paymentReference =
          paymentResponse.transactionId || purchaseReference;
        await queryRunner.manager.save(Purchase, savedPurchase);

        // Commit transaction
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        // Map to response DTO (return converted amount in local currency)
        const response: PurchaseTipResponseDto = {
          id: savedPurchase.id,
          tipId: tip.id,
          buyerId: buyer.id,
          amount: localCurrencyAmount,
          status: savedPurchase.status,
          paymentReference: savedPurchase.paymentReference,
          paymentMethod: savedPurchase.paymentMethod,
          paymentGateway: savedPurchase.paymentGateway,
          checkoutUrl: paymentResponse.checkoutUrl,
          transactionId: paymentResponse.transactionId,
          message: paymentResponse.message || "Payment initiated successfully",
        };

        this.logger.log(
          `Successfully initiated purchase ${savedPurchase.id} for tip ${tipId} by user ${userId}`,
        );

        return response;
      } catch (paymentError) {
        // If payment fails, update purchase status to FAILED
        savedPurchase.status = PurchaseStatusType.FAILED;
        await queryRunner.manager.save(Purchase, savedPurchase);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        this.logger.error(
          `Payment initiation failed for purchase ${savedPurchase.id}: ${paymentError.message}`,
        );

        throw new BadRequestException(
          `Payment initiation failed: ${paymentError.message}`,
        );
      }
    } catch (error) {
      // Only rollback if transaction hasn't been committed
      if (!transactionCommitted && queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`Error purchasing tip: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException("Failed to purchase tip");
    } finally {
      await queryRunner.release();
    }
  }

  async getTopTipsters(
    page: number = 0,
    size: number = 5,
  ): Promise<TopTipstersPageResponseDto> {
    this.logger.log(
      `Fetching top tipsters (page: ${page}, size: ${size})`,
    );

    // Query tipsters with user relationship
    // Order by: 1) rating DESC, 2) topTipster DESC (true first), 3) successRate DESC, 4) name ASC
    // Note: We'll get all tipsters, sort in memory (to handle COALESCE), then paginate
    const query = this.tipsterRepository
      .createQueryBuilder("tipster")
      .leftJoinAndSelect("tipster.user", "user")
      .where("tipster.isActive = :isActive", { isActive: true });

    // Get all tipsters first
    const allTipsters = await query.getMany();
    const totalElements = allTipsters.length;

    // Sort in memory with proper null handling
    allTipsters.sort((a, b) => {
      // 1. Rating (DESC) - treat null as 0 (from tipster table)
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA; // DESC
      }

      // 2. Top Tipster (DESC) - treat null as false, true comes first (from tipster table)
      const topTipsterA = a.topTipster ?? false;
      const topTipsterB = b.topTipster ?? false;
      if (topTipsterA !== topTipsterB) {
        return topTipsterB ? 1 : -1; // true first
      }

      // 3. Success Rate (DESC) - treat null as 0
      const successRateA = a.successRate ?? 0;
      const successRateB = b.successRate ?? 0;
      if (successRateA !== successRateB) {
        return successRateB - successRateA; // DESC
      }

      // 4. Name (ASC) - alphabetical
      const nameA =
        a.user?.displayName ||
        `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim() ||
        "";
      const nameB =
        b.user?.displayName ||
        `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim() ||
        "";
      return nameA.localeCompare(nameB);
    });

    // Apply pagination
    const skip = page * size;
    const tipsters = allTipsters.slice(skip, skip + size);

    // Calculate streak for each tipster and map to DTO
    const tipsterDtos: TopTipsterDto[] = await Promise.all(
      tipsters.map(async (tipster) => {
        const streak = await this.calculateStreak(tipster.id);
        const successRate = Number(tipster.successRate || 0); // Convert to number for toFixed
        const name =
          tipster.user?.displayName ||
          `${tipster.user?.firstName || ""} ${tipster.user?.lastName || ""}`.trim() ||
          "Unknown Tipster";
        const avatar = tipster.avatarUrl || tipster.user?.avatarUrl || null;

        return {
          id: tipster.id,
          name,
          avatar,
          rating: Number(tipster.rating || 0),
          successRate: `${successRate.toFixed(0)}%`,
          totalTips: tipster.totalTips || 0,
          streak,
          verified: tipster.isVerified || false,
        };
      }),
    );

    return {
      tipsters: tipsterDtos,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      currentPage: page,
      pageSize: size,
    };
  }

  async getTipsterDetails(tipsterId: string): Promise<TipsterDetailsDto> {
    this.logger.log(`Fetching tipster details for tipster ${tipsterId}`);

    const tipster = await this.tipsterRepository.findOne({
      where: { id: tipsterId, isActive: true },
      relations: ["user"],
    });

    if (!tipster) {
      throw new NotFoundException(`Tipster not found: ${tipsterId}`);
    }

    const streak = await this.calculateStreak(tipsterId);
    const successRate = Number(tipster.successRate || 0);
    const rating = Number(tipster.rating || 0);

    const name =
      tipster.user?.displayName ||
      `${tipster.user?.firstName || ""} ${tipster.user?.lastName || ""}`.trim() ||
      "Unknown Tipster";
    
    const avatar = tipster.avatarUrl || tipster.user?.avatarUrl || null;

    const response: TipsterDetailsDto = {
      id: tipster.id,
      name,
      avatar,
      rating,
      successRate: `${successRate.toFixed(0)}%`,
      totalTips: tipster.totalTips || 0,
      streak,
      verified: tipster.isVerified || false,
      bio: tipster.bio || null,
      joinedAt: tipster.createdAt || tipster.user?.createdAt || new Date(),
      lastActive: tipster.user?.lastLoginAt || null,
    };

    return response;
  }

  async getTipsterTips(tipsterId: string): Promise<TipsterTipsResponseDto> {
    this.logger.log(`Fetching tips for tipster ${tipsterId}`);

    const tipster = await this.tipsterRepository.findOne({
      where: { id: tipsterId, isActive: true },
    });

    if (!tipster) {
      throw new NotFoundException(`Tipster not found: ${tipsterId}`);
    }

    // Get published tips for this tipster, ordered by publishedAt DESC (or createdAt DESC)
    const tips = await this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.tipster = :tipsterId", { tipsterId })
      .andWhere("tip.isPublished = :isPublished", { isPublished: true })
      .orderBy(
        "COALESCE(tip.publishedAt, tip.createdAt)",
        "DESC",
      )
      .getMany();

    const successRate = Number(tipster.successRate || 0);
    const successRateFormatted = `${successRate.toFixed(0)}%`;

    const tipDtos: TipsterTipDto[] = tips.map((tip) => ({
      id: tip.id,
      title: tip.title,
      price: parseFloat(tip.price.toString()),
      status: tip.status, // Already lowercase from enum
      successRate: successRateFormatted, // Use tipster's current success rate
      createdAt: tip.publishedAt || tip.createdAt,
    }));

    return {
      tips: tipDtos,
    };
  }

  private async calculateStreak(tipsterId: string): Promise<number> {
    // Get tips ordered by publishedAt DESC (or createdAt if publishedAt is null)
    // Count consecutive WON tips from the most recent
    const tips = await this.tipRepository
      .createQueryBuilder("tip")
      .where("tip.tipster = :tipsterId", { tipsterId })
      .andWhere("tip.isPublished = :isPublished", { isPublished: true })
      .orderBy(
        "COALESCE(tip.publishedAt, tip.createdAt)",
        "DESC",
      )
      .getMany();

    let streak = 0;
    for (const tip of tips) {
      if (tip.status === TipStatusType.WON) {
        streak++;
      } else if (
        tip.status === TipStatusType.LOST ||
        tip.status === TipStatusType.PENDING
      ) {
        // Stop counting at first LOST or PENDING tip
        break;
      }
      // Continue if status is VOID or CANCELLED (they don't break the streak)
    }

    return streak;
  }
}
