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
import { CreateTipDto } from "./dto/create-tip.dto";
import { UpdateTipDto } from "./dto/update-tip.dto";
import { AddSelectionDto } from "./dto/add-selection.dto";
import { Tipster } from "../../common/entities/tipster.entity";
import { TipSelection } from "../../common/entities/tip-selection.entity";
import { Match } from "../../common/entities/match.entity";
import { User } from "../../common/entities/user.entity";
import { PredictionType } from "../../common/enums/prediction-type.enum";

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);
  private static readonly MIN_PRICE = 5.0; // Minimum price for paid tips (from database constraint)
  private static readonly MAX_SELECTIONS = 50; // Maximum number of selections per tip (prevent abuse)

  constructor(
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(Tipster)
    private readonly tipsterRepository: Repository<Tipster>,
    @InjectRepository(TipSelection)
    private readonly tipSelectionRepository: Repository<TipSelection>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  async getTips(
    keyword?: string,
    tipsterId?: string,
    minPrice?: number,
    maxPrice?: number,
    status?: string,
    isFree?: boolean,
    page: number = 0,
    size: number = 20
  ): Promise<TipsPageResponseDto> {
    this.logger.debug(
      `Fetching tips with filters: keyword=${keyword}, tipsterId=${tipsterId}, minPrice=${minPrice}, maxPrice=${maxPrice}, status=${status}, isFree=${isFree}, page=${page}, size=${size}`
    );

    // Build query with filters
    let query = this.tipRepository
      .createQueryBuilder("tip")
      .leftJoinAndSelect("tip.tipster", "tipster")
      .leftJoinAndSelect("tipster.user", "user")
      .where("tip.isPublished = :isPublished", { isPublished: true });

    // Keyword search (title or description)
    if (keyword && keyword.trim() !== "") {
      const keywordPattern = `%${keyword.toLowerCase()}%`;
      query = query.andWhere(
        "(LOWER(tip.title) LIKE :keyword OR LOWER(tip.description) LIKE :keyword)",
        { keyword: keywordPattern }
      );
    }

    // Tipster filter
    if (tipsterId) {
      query = query.andWhere("tipster.id = :tipsterId", { tipsterId });
    }

    // Price filters
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

    // Status filter
    if (status && status.trim() !== "") {
      try {
        const statusEnum = TipStatusType[status.toUpperCase() as keyof typeof TipStatusType];
        if (statusEnum) {
          query = query.andWhere("tip.status = :status", { status: statusEnum });
        }
      } catch (error) {
        // Invalid status, ignore
        this.logger.debug(`Invalid status filter: ${status}`);
      }
    }

    // Count total before pagination
    const totalElements = await query.getCount();

    // Sort by top tipsters (rating, success rate) then by latest (publishedAt, createdAt)
    // This ensures tips from top tipsters appear first, then sorted by latest
    query = query
      .orderBy("tipster.rating", "DESC")
      .addOrderBy("tipster.successRate", "DESC")
      .addOrderBy("tip.publishedAt", "DESC")
      .addOrderBy("tip.createdAt", "DESC");

    // Apply pagination
    const skip = page * size;
    query = query.skip(skip).take(size);

    // Execute query
    const tips = await query.getMany();

    // Map to response DTOs
    const tipResponses = tips.map((tip) => this.mapToResponse(tip));

    // Count free tips (tips where price = 0)
    const freeTipsCount = await this.countFreeTips();

    // Count available tips (tips where all matches are still valid and none have started)
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

    this.logger.log(`Retrieved ${tips.length} tips (page ${page}, total: ${totalElements})`);
    return response;
  }

  private mapToResponse(tip: Tip): TipResponseDto {
    const response = new TipResponseDto();
    response.id = tip.id;
    response.title = tip.title;
    response.description = tip.description || null;
    response.price = parseFloat(tip.price.toString());
    response.totalOdds = tip.totalOdds ? parseFloat(tip.totalOdds.toString()) : null;
    response.status = tip.status;
    response.purchasesCount = tip.purchasesCount;
    response.publishedAt = tip.publishedAt || null;
    response.earliestMatchDate = tip.earliestMatchDate || null;
    response.createdAt = tip.createdAt;

    // Map tipster info
    if (tip.tipster) {
      const tipsterInfo = new TipsterBasicInfoDto();
      tipsterInfo.id = tip.tipster.id;
      tipsterInfo.rating = parseFloat(tip.tipster.rating.toString());
      tipsterInfo.successRate = parseFloat(tip.tipster.successRate.toString());
      tipsterInfo.isVerified = tip.tipster.isVerified;
      tipsterInfo.totalTips = tip.tipster.totalTips;

      // Get display name and avatar from user
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

  /**
   * Count free tips (tips where price = 0)
   */
  private async countFreeTips(): Promise<number> {
    return this.tipRepository.count({
      where: {
        isPublished: true,
        price: 0,
      } as FindOptionsWhere<Tip>,
    });
  }

  /**
   * Count available tips (tips where all matches are still valid and none have started)
   * A tip is available if:
   * - It is published
   * - All its matches have status = scheduled
   * - All its matches have matchDate > now (not started)
   * Uses a query similar to the Java NOT EXISTS approach
   */
  private async countAvailableTips(): Promise<number> {
    const now = new Date();

    // Count tips that are published and have no invalid matches
    // A tip is available if it doesn't have any selections with matches that are:
    // - Not scheduled, OR
    // - Already started (matchDate <= now)
    // Using raw SQL with NOT EXISTS subquery for efficiency
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
          scheduledStatus: MatchStatusType.scheduled, // "scheduled"
          now: now.toISOString(),
        }
      )
      .getRawOne<{ count: string }>();

    return result ? parseInt(result.count, 10) : 0;
  }

  /**
   * Create a new tip with validations and security checks
   * Only users with TIPSTER role can create tips
   */
  async createTip(createTipDto: CreateTipDto, userId: string): Promise<TipResponseDto> {
    this.logger.debug(`Creating tip for user ${userId}: ${createTipDto.title}`);

    // Start transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate user exists and is active
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      // 2. Validate user has TIPSTER role
      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        this.logger.warn(`User ${userId} attempted to create tip without TIPSTER role`);
        throw new ForbiddenException("Only tipsters can create tips");
      }

      // 3. Get or create tipster record
      let tipster = await queryRunner.manager.findOne(Tipster, {
        where: { user: { id: userId } },
        relations: ["user"],
      });

      if (!tipster) {
        // Create tipster record if it doesn't exist
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

      // 4. Validate and sanitize input
      this.validateCreateTipDto(createTipDto);

      // 5. Create tip entity (can be created without selections for draft mode)
      const tip = queryRunner.manager.create(Tip, {
        tipster: { id: tipster.id },
        isAi: false,
        title: createTipDto.title.trim(),
        description: createTipDto.description?.trim() || null,
        price: createTipDto.price,
        status: TipStatusType.PENDING,
        isPublished: false, // Tips are not published by default
        purchasesCount: 0,
        totalRevenue: 0,
      });

      // 6. Process selections if provided
      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;
      const selections: TipSelection[] = [];

      if (createTipDto.selections && createTipDto.selections.length > 0) {
        // Validate all matches exist and are scheduled
        const matchIds = createTipDto.selections.map((s) => s.matchId);
        const uniqueMatchIds = [...new Set(matchIds)];

        if (uniqueMatchIds.length > TipsService.MAX_SELECTIONS) {
          throw new BadRequestException(
            `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`
          );
        }

        const matches = await queryRunner.manager.find(Match, {
          where: uniqueMatchIds.map((id) => ({ id })),
        });

        if (matches.length !== uniqueMatchIds.length) {
          const foundIds = new Set(matches.map((m) => m.id));
          const missingIds = uniqueMatchIds.filter((id) => !foundIds.has(id));
          throw new NotFoundException(`Matches not found: ${missingIds.join(", ")}`);
        }

        // Validate all matches are scheduled and not started
        const now = new Date();
        const invalidMatches = matches.filter(
          (m) => m.status !== MatchStatusType.scheduled || m.matchDate <= now
        );

        if (invalidMatches.length > 0) {
          throw new BadRequestException(
            `Cannot create tip: ${invalidMatches.length} match(es) are not scheduled or have already started`
          );
        }

        // Find earliest match date
        for (const match of matches) {
          if (!earliestMatchDate || match.matchDate < earliestMatchDate) {
            earliestMatchDate = match.matchDate;
          }
        }

        // Create tip selections and calculate total odds
        const selectionKeys = new Set<string>(); // For duplicate detection

        for (const selectionDto of createTipDto.selections) {
          const match = matches.find((m) => m.id === selectionDto.matchId);
          if (!match) {
            throw new NotFoundException(`Match not found: ${selectionDto.matchId}`);
          }

          // Map prediction string to prediction type and value
          const { predictionType, predictionValue } = this.mapPredictionString(
            selectionDto.prediction
          );

          // Validate odds
          if (!selectionDto.odds || selectionDto.odds < 1.0) {
            throw new BadRequestException(
              `Invalid odds for selection on match ${match.id}: odds must be at least 1.0`
            );
          }

          // Check for duplicate selections (same match, prediction type, and value)
          const selectionKey = `${selectionDto.matchId}-${predictionType}-${predictionValue}`;
          if (selectionKeys.has(selectionKey)) {
            throw new BadRequestException(
              `Duplicate selection: match ${selectionDto.matchId} with prediction ${selectionDto.prediction}`
            );
          }
          selectionKeys.add(selectionKey);

          const selection = queryRunner.manager.create(TipSelection, {
            tip: tip, // Will be set after tip is saved
            match: match,
            predictionType: predictionType,
            predictionValue: predictionValue,
            odds: selectionDto.odds,
            isVoid: false,
          });

          selections.push(selection);
          totalOdds *= selectionDto.odds;
        }

        tip.totalOdds = totalOdds;
        tip.earliestMatchDate = earliestMatchDate;
      }

      // 7. Save tip first (to get ID)
      const savedTip = await queryRunner.manager.save(Tip, tip);

      // 8. Save selections with tip ID if any
      for (const selection of selections) {
        selection.tip = savedTip;
        await queryRunner.manager.save(TipSelection, selection);
      }

      // 11. Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully created tip ${savedTip.id} by user ${userId} with ${selections.length} selections`
      );

      // 12. Load tip with relations for response
      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: savedTip.id },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException("Failed to retrieve created tip");
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error creating tip: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException("Failed to create tip");
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate create tip DTO with comprehensive checks
   */
  private validateCreateTipDto(dto: CreateTipDto): void {
    // Validate title
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

    // Validate price
    if (dto.price === null || dto.price === undefined || typeof dto.price !== "number") {
      throw new BadRequestException("Price is required and must be a number");
    }

    if (dto.price < 0) {
      throw new BadRequestException("Price must be at least 0");
    }

    // If price > 0, enforce minimum price
    if (dto.price > 0 && dto.price < TipsService.MIN_PRICE) {
      throw new BadRequestException(
        `Price must be at least ${TipsService.MIN_PRICE} for paid tips, or 0 for free tips`
      );
    }

    // Validate selections (optional for draft tips)
    if (dto.selections !== undefined) {
      if (!Array.isArray(dto.selections)) {
        throw new BadRequestException("Selections must be an array");
      }

      if (dto.selections.length > TipsService.MAX_SELECTIONS) {
        throw new BadRequestException(
          `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`
        );
      }
    }

    // Validate each selection
    for (let i = 0; i < dto.selections.length; i++) {
      const selection = dto.selections[i];
      if (!selection.matchId || typeof selection.matchId !== "string") {
        throw new BadRequestException(`Selection ${i + 1}: matchId is required and must be a string`);
      }

      if (!selection.prediction || typeof selection.prediction !== "string") {
        throw new BadRequestException(
          `Selection ${i + 1}: prediction is required and must be a string`
        );
      }

      if (selection.odds === null || selection.odds === undefined || typeof selection.odds !== "number") {
        throw new BadRequestException(`Selection ${i + 1}: odds is required and must be a number`);
      }

      if (selection.odds < 1.0) {
        throw new BadRequestException(`Selection ${i + 1}: odds must be at least 1.0`);
      }

      if (selection.odds > 1000) {
        throw new BadRequestException(`Selection ${i + 1}: odds must not exceed 1000`);
      }
    }

    // Validate description (if provided)
    if (dto.description !== undefined && dto.description !== null) {
      if (typeof dto.description !== "string") {
        throw new BadRequestException("Description must be a string");
      }

      // Limit description length (optional - can be removed if unlimited)
      const maxDescriptionLength = 10000;
      if (dto.description.length > maxDescriptionLength) {
        throw new BadRequestException(
          `Description must not exceed ${maxDescriptionLength} characters`
        );
      }
    }
  }

  /**
   * Map prediction string to PredictionType enum and value
   * Supports common prediction formats from frontend
   */
  private mapPredictionString(prediction: string): {
    predictionType: PredictionType;
    predictionValue: string;
  } {
    const normalized = prediction.toLowerCase().trim();

    // Match result predictions
    if (normalized === "home_win" || normalized === "home") {
      return { predictionType: PredictionType.MATCH_RESULT, predictionValue: "home_win" };
    }
    if (normalized === "away_win" || normalized === "away") {
      return { predictionType: PredictionType.MATCH_RESULT, predictionValue: "away_win" };
    }
    if (normalized === "draw") {
      return { predictionType: PredictionType.MATCH_RESULT, predictionValue: "draw" };
    }

    // Over/Under predictions
    const overUnderMatch = normalized.match(/^(over|under)[_\s]?(\d+\.?\d*)$/);
    if (overUnderMatch) {
      const direction = overUnderMatch[1];
      const line = overUnderMatch[2];
      return {
        predictionType: PredictionType.OVER_UNDER,
        predictionValue: `${direction}_${line}`,
      };
    }

    // Both teams to score
    if (normalized === "btts_yes" || normalized === "btts yes" || normalized === "both_teams_yes") {
      return { predictionType: PredictionType.BOTH_TEAMS_TO_SCORE, predictionValue: "yes" };
    }
    if (normalized === "btts_no" || normalized === "btts no" || normalized === "both_teams_no") {
      return { predictionType: PredictionType.BOTH_TEAMS_TO_SCORE, predictionValue: "no" };
    }

    // Double chance
    if (normalized === "home_draw" || normalized === "1x") {
      return { predictionType: PredictionType.DOUBLE_CHANCE, predictionValue: "home_draw" };
    }
    if (normalized === "home_away" || normalized === "12") {
      return { predictionType: PredictionType.DOUBLE_CHANCE, predictionValue: "home_away" };
    }
    if (normalized === "away_draw" || normalized === "x2") {
      return { predictionType: PredictionType.DOUBLE_CHANCE, predictionValue: "away_draw" };
    }

    // Handicap (assume it's a handicap prediction)
    if (normalized.includes("handicap")) {
      return { predictionType: PredictionType.HANDICAP, predictionValue: normalized };
    }

    // Default: treat as custom prediction value
    // Store as-is but validate length
    if (normalized.length > 100) {
      throw new BadRequestException(
        `Prediction value must not exceed 100 characters: ${prediction}`
      );
    }

    // Try to infer type from value
    if (normalized.startsWith("over_") || normalized.startsWith("under_")) {
      return { predictionType: PredictionType.OVER_UNDER, predictionValue: normalized };
    }
    if (normalized.includes("btts") || normalized.includes("both_teams")) {
      return { predictionType: PredictionType.BOTH_TEAMS_TO_SCORE, predictionValue: normalized };
    }
    if (
      normalized.includes("home_draw") ||
      normalized.includes("home_away") ||
      normalized.includes("away_draw")
    ) {
      return { predictionType: PredictionType.DOUBLE_CHANCE, predictionValue: normalized };
    }
    if (normalized.includes("handicap")) {
      return { predictionType: PredictionType.HANDICAP, predictionValue: normalized };
    }

    // Default to MATCH_RESULT for unrecognized formats
    return { predictionType: PredictionType.MATCH_RESULT, predictionValue: normalized };
  }

  /**
   * Update a tip (title, description, price)
   * Only allowed if tip is not published (isPublished = false)
   * Only the tip owner can update it
   */
  async updateTip(
    tipId: string,
    updateTipDto: UpdateTipDto,
    userId: string
  ): Promise<TipResponseDto> {
    this.logger.debug(`Updating tip ${tipId} by user ${userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate user exists and is active
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      // 2. Validate user has TIPSTER role
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

      // 3. Get tip with tipster relation
      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      // 4. Verify tip belongs to the user
      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException("You can only update your own tips");
      }

      // 5. Verify tip is not published
      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot update tip: tip has already been published and is available for purchase"
        );
      }

      // 6. Update tip fields
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
        if (updateTipDto.price > 0 && updateTipDto.price < TipsService.MIN_PRICE) {
          throw new BadRequestException(
            `Price must be at least ${TipsService.MIN_PRICE} for paid tips, or 0 for free tips`
          );
        }
        tip.price = updateTipDto.price;
      }

      // 7. Save updated tip
      const updatedTip = await queryRunner.manager.save(Tip, tip);

      // 8. Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Successfully updated tip ${tipId} by user ${userId}`);

      // 9. Load tip with relations for response
      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: updatedTip.id },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException("Failed to retrieve updated tip");
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

  /**
   * Add or update a selection to a tip
   * Only allowed if tip is not published
   * Only the tip owner can add selections
   */
  async addSelection(
    tipId: string,
    addSelectionDto: AddSelectionDto,
    userId: string
  ): Promise<TipResponseDto> {
    this.logger.debug(
      `Adding selection to tip ${tipId} by user ${userId}: match ${addSelectionDto.matchId}, prediction ${addSelectionDto.prediction}`
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate user exists and is active
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      // 2. Validate user has TIPSTER role
      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        throw new ForbiddenException("Only tipsters can add selections to tips");
      }

      // 3. Get tip with tipster relation
      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user", "selections"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      // 4. Verify tip belongs to the user
      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException("You can only add selections to your own tips");
      }

      // 5. Verify tip is not published
      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot add selections: tip has already been published and is available for purchase"
        );
      }

      // 6. Validate match exists and is scheduled
      const match = await queryRunner.manager.findOne(Match, {
        where: { id: addSelectionDto.matchId },
      });

      if (!match) {
        throw new NotFoundException(`Match not found: ${addSelectionDto.matchId}`);
      }

      const now = new Date();
      if (match.status !== MatchStatusType.scheduled || match.matchDate <= now) {
        throw new BadRequestException(
          "Cannot add selection: match is not scheduled or has already started"
        );
      }

      // 7. Map prediction string to prediction type and value
      const { predictionType, predictionValue } = this.mapPredictionString(
        addSelectionDto.prediction
      );

      // 8. Validate odds
      if (!addSelectionDto.odds || addSelectionDto.odds < 1.0) {
        throw new BadRequestException("Odds must be at least 1.0");
      }

      if (addSelectionDto.odds > 1000) {
        throw new BadRequestException("Odds must not exceed 1000");
      }

      // 9. Check for existing selection with same match, prediction type, and value
      const existingSelection = await queryRunner.manager.findOne(TipSelection, {
        where: {
          tip: { id: tipId },
          match: { id: addSelectionDto.matchId },
          predictionType: predictionType,
          predictionValue: predictionValue,
        },
      });

      // 10. Handle mutual exclusivity (match_result, double_chance, handicap)
      if (predictionType === PredictionType.MATCH_RESULT) {
        // Remove any double_chance or handicap selections for this match
        await queryRunner.manager.delete(TipSelection, {
          tip: { id: tipId },
          match: { id: addSelectionDto.matchId },
          predictionType: In([
            PredictionType.DOUBLE_CHANCE,
            PredictionType.HANDICAP,
          ]),
        });
      } else if (predictionType === PredictionType.DOUBLE_CHANCE) {
        // Remove any match_result or handicap selections for this match
        await queryRunner.manager.delete(TipSelection, {
          tip: { id: tipId },
          match: { id: addSelectionDto.matchId },
          predictionType: In([
            PredictionType.MATCH_RESULT,
            PredictionType.HANDICAP,
          ]),
        });
      } else if (predictionType === PredictionType.HANDICAP) {
        // Remove any match_result or double_chance selections for this match
        await queryRunner.manager.delete(TipSelection, {
          tip: { id: tipId },
          match: { id: addSelectionDto.matchId },
          predictionType: In([
            PredictionType.MATCH_RESULT,
            PredictionType.DOUBLE_CHANCE,
          ]),
        });
      }

      // 11. Remove any existing selection of the same betType for this match (to replace it)
      if (existingSelection) {
        await queryRunner.manager.remove(TipSelection, existingSelection);
      } else {
        // Check if we're at the max selections limit
        const currentSelectionsCount = await queryRunner.manager.count(
          TipSelection,
          {
            where: { tip: { id: tipId } },
          }
        );

        if (currentSelectionsCount >= TipsService.MAX_SELECTIONS) {
          throw new BadRequestException(
            `Maximum ${TipsService.MAX_SELECTIONS} selections allowed per tip`
          );
        }
      }

      // 12. Create or update selection
      const selection = queryRunner.manager.create(TipSelection, {
        tip: { id: tipId },
        match: { id: addSelectionDto.matchId },
        predictionType: predictionType,
        predictionValue: predictionValue,
        odds: addSelectionDto.odds,
        isVoid: false,
      });

      await queryRunner.manager.save(TipSelection, selection);

      // 13. Recalculate total odds and earliest match date
      const allSelections = await queryRunner.manager.find(TipSelection, {
        where: { tip: { id: tipId } },
        relations: ["match"],
      });

      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;

      for (const sel of allSelections) {
        totalOdds *= sel.odds || 1.0;
        if (sel.match && sel.match.matchDate) {
          if (!earliestMatchDate || sel.match.matchDate < earliestMatchDate) {
            earliestMatchDate = sel.match.matchDate;
          }
        }
      }

      tip.totalOdds = totalOdds > 1.0 ? totalOdds : null;
      tip.earliestMatchDate = earliestMatchDate;

      await queryRunner.manager.save(Tip, tip);

      // 14. Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully added selection to tip ${tipId} by user ${userId}`
      );

      // 15. Load tip with relations for response
      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException("Failed to retrieve updated tip");
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error adding selection: ${error.message}`, error.stack);

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

  /**
   * Remove a selection from a tip
   * Only allowed if tip is not published
   * Only the tip owner can remove selections
   */
  async removeSelection(
    tipId: string,
    selectionId: string,
    userId: string
  ): Promise<TipResponseDto> {
    this.logger.debug(
      `Removing selection ${selectionId} from tip ${tipId} by user ${userId}`
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate user exists and is active
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException("User not found or inactive");
      }

      // 2. Validate user has TIPSTER role
      const userRoles = await queryRunner.manager
        .createQueryBuilder()
        .from("user_roles", "ur")
        .where("ur.user_id = :userId", { userId })
        .getRawMany();

      const roles = userRoles.map((ur) => ur.role);
      const hasTipsterRole = roles.includes("TIPSTER");

      if (!hasTipsterRole) {
        throw new ForbiddenException("Only tipsters can remove selections from tips");
      }

      // 3. Get tip with tipster relation
      const tip = await queryRunner.manager.findOne(Tip, {
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tip) {
        throw new NotFoundException(`Tip not found: ${tipId}`);
      }

      // 4. Verify tip belongs to the user
      if (tip.tipster.user?.id !== userId) {
        throw new ForbiddenException("You can only remove selections from your own tips");
      }

      // 5. Verify tip is not published
      if (tip.isPublished) {
        throw new BadRequestException(
          "Cannot remove selections: tip has already been published and is available for purchase"
        );
      }

      // 6. Get selection and verify it belongs to the tip
      const selection = await queryRunner.manager.findOne(TipSelection, {
        where: { id: selectionId, tip: { id: tipId } },
      });

      if (!selection) {
        throw new NotFoundException(
          `Selection not found: ${selectionId} or does not belong to tip ${tipId}`
        );
      }

      // 7. Remove selection
      await queryRunner.manager.remove(TipSelection, selection);

      // 8. Recalculate total odds and earliest match date
      const allSelections = await queryRunner.manager.find(TipSelection, {
        where: { tip: { id: tipId } },
        relations: ["match"],
      });

      let totalOdds = 1.0;
      let earliestMatchDate: Date | null = null;

      for (const sel of allSelections) {
        totalOdds *= sel.odds || 1.0;
        if (sel.match && sel.match.matchDate) {
          if (!earliestMatchDate || sel.match.matchDate < earliestMatchDate) {
            earliestMatchDate = sel.match.matchDate;
          }
        }
      }

      tip.totalOdds = allSelections.length > 0 && totalOdds > 1.0 ? totalOdds : null;
      tip.earliestMatchDate = earliestMatchDate;

      await queryRunner.manager.save(Tip, tip);

      // 9. Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Successfully removed selection ${selectionId} from tip ${tipId} by user ${userId}`
      );

      // 10. Load tip with relations for response
      const tipWithRelations = await this.tipRepository.findOne({
        where: { id: tipId },
        relations: ["tipster", "tipster.user"],
      });

      if (!tipWithRelations) {
        throw new InternalServerErrorException("Failed to retrieve updated tip");
      }

      return this.mapToResponse(tipWithRelations);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error removing selection: ${error.message}`, error.stack);

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
}
