import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Request,
  UseGuards,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TipsService } from "./tips.service";
import { TipsPageResponseDto } from "./dto/tips-page-response.dto";
import { TipResponseDto } from "./dto/tip-response.dto";
import { TopTipstersPageResponseDto } from "./dto/top-tipster-response.dto";
import { TipsterDetailsDto } from "./dto/tipster-details-response.dto";
import { TipsterTipsResponseDto } from "./dto/tipster-tips-response.dto";
import { TipEditingResponseDto } from "./dto/tip-editing-response.dto";
import { CreateTipDto } from "./dto/create-tip.dto";
import { UpdateTipDto } from "./dto/update-tip.dto";
import { AddSelectionDto } from "./dto/add-selection.dto";
import { PurchaseTipDto } from "./dto/purchase-tip.dto";
import { PurchaseTipResponseDto } from "./dto/purchase-tip-response.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../modules/auth/guards/roles.guard";
import { Roles } from "../../modules/auth/decorators/roles.decorator";
import { UserRoleType } from "../../common/enums/user-role-type.enum";

@ApiTags("Tips")
@Controller("tips")
export class TipsController {
  private readonly logger = new Logger(TipsController.name);

  constructor(private readonly tipsService: TipsService) {}

  @Get()
  @ApiOperation({
    summary: "Get tips with search, filter, and pagination",
    description:
      "Retrieve tips with optional search, filters, and pagination. By default returns the latest tips from top tipsters, sorted by tipster rating/success rate and then by published date. Also returns free tips count and available tips count.",
  })
  @ApiQuery({
    name: "keyword",
    required: false,
    description: "Search keyword to filter tips by title or description",
    example: "premier league",
  })
  @ApiQuery({
    name: "tipsterId",
    required: false,
    description: "Filter tips by tipster ID (UUID)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiQuery({
    name: "minPrice",
    required: false,
    description: "Minimum price filter",
    example: 5.0,
    type: Number,
  })
  @ApiQuery({
    name: "maxPrice",
    required: false,
    description: "Maximum price filter",
    example: 20.0,
    type: Number,
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by tip status (PENDING, WON, LOST, VOID, CANCELLED)",
    example: "PENDING",
    enum: ["PENDING", "WON", "LOST", "VOID", "CANCELLED"],
  })
  @ApiQuery({
    name: "isFree",
    required: false,
    description: "Filter by free tips (price = 0) or paid tips (price > 0)",
    example: false,
    type: Boolean,
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (0-based)",
    example: 0,
    type: Number,
  })
  @ApiQuery({
    name: "size",
    required: false,
    description: "Page size (number of tips per page)",
    example: 20,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Tips retrieved successfully",
    type: TipsPageResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          tips: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              title: "EPL Weekend Acca",
              description: "Top picks for the weekend",
              price: 10.5,
              totalOdds: 15.75,
              status: "PENDING",
              purchasesCount: 25,
              publishedAt: "2024-01-15T10:00:00Z",
              earliestMatchDate: "2024-01-15T15:00:00Z",
              createdAt: "2024-01-10T08:00:00Z",
              tipster: {
                id: "550e8400-e29b-41d4-a716-446655440001",
                displayName: "John Doe",
                avatarUrl: "https://example.com/avatar.png",
                isVerified: true,
                rating: 4.5,
                successRate: 75.5,
                totalTips: 150,
              },
            },
          ],
          totalElements: 150,
          totalPages: 8,
          currentPage: 0,
          pageSize: 20,
          freeTipsCount: 25,
          availableTipsCount: 120,
        },
        message: "Tips retrieved successfully",
      },
    },
  })
  async getTips(
    @Query("keyword") keyword?: string,
    @Query("tipsterId") tipsterId?: string,
    @Query("minPrice") minPrice?: number,
    @Query("maxPrice") maxPrice?: number,
    @Query("status") status?: string,
    @Query("isFree") isFree?: string | boolean,
    @Query("page") page?: number,
    @Query("size") size?: number,
  ): Promise<ApiResponseClass<TipsPageResponseDto>> {
    const pageNum = page !== undefined ? Number(page) : 0;
    const pageSize = size !== undefined ? Number(size) : 20;

    const minPriceNum = minPrice !== undefined ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : undefined;

    let isFreeBool: boolean | undefined = undefined;
    if (isFree !== undefined && isFree !== null) {
      if (typeof isFree === "string") {
        isFreeBool = isFree.toLowerCase() === "true";
      } else if (typeof isFree === "boolean") {
        isFreeBool = isFree;
      } else {
        isFreeBool = Boolean(isFree);
      }
    }

    const response = await this.tipsService.getTips(
      keyword,
      tipsterId,
      minPriceNum,
      maxPriceNum,
      status,
      isFreeBool,
      pageNum,
      pageSize,
    );

    return ApiResponseClass.success(response, "Tips retrieved successfully");
  }

  @Get("top-tipsters")
  @ApiOperation({
    summary: "Get top tipsters based on rating",
    description:
      "Retrieve top tipsters sorted by rating (from User table). Includes pagination support. Default returns top 5 tipsters.",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (0-based)",
    example: 0,
    type: Number,
  })
  @ApiQuery({
    name: "size",
    required: false,
    description: "Page size (number of tipsters per page). Default is 5.",
    example: 5,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Top tipsters retrieved successfully",
    type: TopTipstersPageResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          tipsters: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              name: "John Smith",
              avatar: "https://example.com/avatar.png",
              rating: 92,
              successRate: "87%",
              totalTips: 156,
              streak: 8,
              verified: true,
            },
          ],
          totalElements: 50,
          totalPages: 10,
          currentPage: 0,
          pageSize: 5,
        },
        message: "Top tipsters retrieved successfully",
      },
    },
  })
  async getTopTipsters(
    @Query("page") page?: number,
    @Query("size") size?: number,
  ): Promise<ApiResponseClass<TopTipstersPageResponseDto>> {
    const pageNum = page !== undefined ? Number(page) : 0;
    const pageSize = size !== undefined ? Number(size) : 5; // Default to 5

    const response = await this.tipsService.getTopTipsters(pageNum, pageSize);

    return ApiResponseClass.success(
      response,
      "Top tipsters retrieved successfully",
    );
  }

  @Get("tipsters/:id/tips")
  @ApiOperation({
    summary: "Get recent tips for a tipster",
    description:
      "Retrieve recent published tips for a specific tipster, ordered by published date (newest first). Returns tips with tipster's current success rate.",
  })
  @ApiResponse({
    status: 200,
    description: "Tipster tips retrieved successfully",
    type: TipsterTipsResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          tips: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              title: "Premier League Double",
              price: 4.99,
              status: "won",
              successRate: "92%",
              createdAt: "2024-01-15T10:00:00Z",
            },
          ],
        },
        message: "Tipster tips retrieved successfully",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Tipster not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tipster not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async getTipsterTips(
    @Param("id") id: string,
  ): Promise<ApiResponseClass<TipsterTipsResponseDto>> {
    const response = await this.tipsService.getTipsterTips(id);

    return ApiResponseClass.success(
      response,
      "Tipster tips retrieved successfully",
    );
  }

  @Get("tipsters/:id")
  @ApiOperation({
    summary: "Get tipster details",
    description:
      "Retrieve detailed information about a specific tipster, including rating, success rate, total tips, streak, and profile information.",
  })
  @ApiResponse({
    status: 200,
    description: "Tipster details retrieved successfully",
    type: TipsterDetailsDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "John Smith",
          avatar: "https://example.com/avatar.png",
          rating: 92,
          successRate: "87%",
          totalTips: 156,
          streak: 8,
          verified: true,
          bio: "Professional football analyst with over 10 years of experience.",
          joinedAt: "2023-01-15T00:00:00Z",
          lastActive: "2024-01-15T10:15:00Z",
        },
        message: "Tipster details retrieved successfully",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Tipster not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tipster not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async getTipsterDetails(
    @Param("id") id: string,
  ): Promise<ApiResponseClass<TipsterDetailsDto>> {
    const response = await this.tipsService.getTipsterDetails(id);

    return ApiResponseClass.success(
      response,
      "Tipster details retrieved successfully",
    );
  }

  @Get("my-tips")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get all tips belonging to the current user",
    description:
      "Retrieve all tips (both published and unpublished) belonging to the authenticated tipster. Sorted by newest first. Supports pagination for infinite scroll.",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number (0-based)",
    example: 0,
    type: Number,
  })
  @ApiQuery({
    name: "size",
    required: false,
    description: "Page size (number of tips per page)",
    example: 20,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Tips retrieved successfully",
    type: TipsPageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not a tipster",
  })
  async getMyTips(
    @Query("page") page?: string,
    @Query("size") size?: string,
    @Request() req?: any,
  ): Promise<ApiResponseClass<TipsPageResponseDto>> {
    const userId = req?.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const pageNum = page ? parseInt(page, 10) : 0;
    const pageSize = size ? parseInt(size, 10) : 20;

    if (isNaN(pageNum) || pageNum < 0) {
      throw new BadRequestException("Invalid page number");
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException(
        "Invalid page size. Must be between 1 and 100",
      );
    }

    const response = await this.tipsService.getMyTips(
      userId,
      pageNum,
      pageSize,
    );

    return ApiResponseClass.success(response, "Tips retrieved successfully");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get tip details",
    description:
      "Get tip details with selections. Only accessible by the tip creator or users who have purchased the tip. Free tips (price = 0) are accessible to all authenticated users when published.",
  })
  @ApiResponse({
    status: 200,
    description: "Tip details retrieved successfully",
    type: TipEditingResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user does not have access to this tip",
    schema: {
      example: {
        statusCode: 403,
        message:
          "You do not have access to this tip. Please purchase it to view details.",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  async getTipDetails(
    @Param("id") tipId: string,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipEditingResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.getTipDetails(tipId, userId);

    return ApiResponseClass.success(tip, "Tip details retrieved successfully");
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a new tip",
    description:
      "Create a new tip with match selections. Only tipsters can create tips. The tip will be created in PENDING status and is not published by default.",
  })
  @ApiBody({
    type: CreateTipDto,
    description: "Tip creation data",
    examples: {
      example1: {
        value: {
          title: "EPL Weekend Acca",
          description: "Top picks for this weekend's Premier League matches",
          price: 10.5,
          selections: [
            {
              matchId: "550e8400-e29b-41d4-a716-446655440000",
              prediction: "home_win",
              odds: 2.5,
            },
            {
              matchId: "550e8400-e29b-41d4-a716-446655440001",
              prediction: "over_2.5",
              odds: 1.8,
            },
          ],
        },
        summary: "Example tip with multiple selections",
      },
      example2: {
        value: {
          title: "Free Weekend Pick",
          description: "Free prediction for this weekend",
          price: 0,
          selections: [
            {
              matchId: "550e8400-e29b-41d4-a716-446655440000",
              prediction: "home_win",
              odds: 2.5,
            },
          ],
        },
        summary: "Example free tip",
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Tip created successfully",
    type: TipResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "EPL Weekend Acca",
          description: "Top picks for this weekend's Premier League matches",
          price: 10.5,
          totalOdds: 4.5,
          status: "PENDING",
          purchasesCount: 0,
          publishedAt: null,
          earliestMatchDate: "2024-01-15T15:00:00Z",
          createdAt: "2024-01-10T08:00:00Z",
          tipster: {
            id: "550e8400-e29b-41d4-a716-446655440001",
            displayName: "John Doe",
            avatarUrl: "https://example.com/avatar.png",
            isVerified: true,
            rating: 4.5,
            successRate: 75.5,
            totalTips: 150,
          },
        },
        message: "Tip created successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid input data",
    schema: {
      example: {
        statusCode: 400,
        message: "Title cannot be empty",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "Only tipsters can create tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - match or user not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Matches not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
    schema: {
      example: {
        statusCode: 401,
        message: "Unauthorized",
        success: false,
      },
    },
  })
  async createTip(
    @Body() createTipDto: CreateTipDto,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.createTip(createTipDto, userId);

    return ApiResponseClass.success(tip, "Tip created successfully");
  }

  @Get(":id/editing")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get tip details for editing or viewing",
    description:
      "Get tip details with selections. Accessible by the tip creator. Unpublished tips can be edited, published tips can be viewed (read-only).",
  })
  @ApiResponse({
    status: 200,
    description: "Tip details retrieved successfully",
    type: TipEditingResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not the tip owner or not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "You can only view your own tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async getTipForEditing(
    @Param("id") tipId: string,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipEditingResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.getTipForEditing(tipId, userId);

    return ApiResponseClass.success(tip, "Tip details retrieved successfully");
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update a tip",
    description:
      "Update tip title, description, or price. Only allowed if the tip is not published (isPublished = false). Only the tip owner can update it.",
  })
  @ApiBody({
    type: UpdateTipDto,
    description: "Tip update data",
    examples: {
      example1: {
        value: {
          title: "Updated EPL Weekend Acca",
          description: "Updated description",
          price: 15.0,
        },
        summary: "Update all fields",
      },
      example2: {
        value: {
          price: 0,
        },
        summary: "Update only price to make it free",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Tip updated successfully",
    type: TipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - tip is published or invalid data",
    schema: {
      example: {
        statusCode: 400,
        message:
          "Cannot update tip: tip has already been published and is available for purchase",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not the tip owner or not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "You can only update your own tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async updateTip(
    @Param("id") tipId: string,
    @Body() updateTipDto: UpdateTipDto,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.updateTip(tipId, updateTipDto, userId);

    return ApiResponseClass.success(tip, "Tip updated successfully");
  }

  @Post(":id/selections")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add or update a selection to a tip",
    description:
      "Add a new selection or update an existing one for a tip. Only allowed if the tip is not published. Handles mutual exclusivity between match_result, double_chance, and handicap. Only the tip owner can add selections.",
  })
  @ApiBody({
    type: AddSelectionDto,
    description: "Selection data",
    examples: {
      example1: {
        value: {
          matchId: "550e8400-e29b-41d4-a716-446655440000",
          prediction: "home_win",
          odds: 2.5,
        },
        summary: "Match result selection",
      },
      example2: {
        value: {
          matchId: "550e8400-e29b-41d4-a716-446655440000",
          prediction: "over_2.5",
          odds: 1.8,
        },
        summary: "Over/under selection",
      },
      example3: {
        value: {
          matchId: "550e8400-e29b-41d4-a716-446655440000",
          prediction: "handicap",
          odds: 2.2,
          betLine: -1.5,
        },
        summary: "Handicap selection",
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Selection added successfully",
    type: TipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - tip is published, invalid data, or max selections reached",
    schema: {
      example: {
        statusCode: 400,
        message:
          "Cannot add selections: tip has already been published and is available for purchase",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not the tip owner or not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "You can only add selections to your own tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip or match not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async addSelection(
    @Param("id") tipId: string,
    @Body() addSelectionDto: AddSelectionDto,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.addSelection(
      tipId,
      addSelectionDto,
      userId,
    );

    return ApiResponseClass.success(tip, "Selection added successfully");
  }

  @Delete(":id/selections/:selectionId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Remove a selection from a tip",
    description:
      "Remove a selection from a tip. Only allowed if the tip is not published. Only the tip owner can remove selections.",
  })
  @ApiResponse({
    status: 200,
    description: "Selection removed successfully",
    type: TipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - tip is published",
    schema: {
      example: {
        statusCode: 400,
        message:
          "Cannot remove selections: tip has already been published and is available for purchase",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not the tip owner or not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "You can only remove selections from your own tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip or selection not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Selection not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async removeSelection(
    @Param("id") tipId: string,
    @Param("selectionId") selectionId: string,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.removeSelection(
      tipId,
      selectionId,
      userId,
    );

    return ApiResponseClass.success(tip, "Selection removed successfully");
  }

  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.TIPSTER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Publish a tip (make it available for purchase)",
    description:
      "Publish a tip after setting the price, title, and making tip selections. This endpoint performs comprehensive validations including: user must be a tipster, tip must belong to the user, tip must not already be published, at least one selection is required, all matches must be at least 12 hours before their start time, price must pass min-max validation, free tips must be enabled if price is 0, and all matches must be scheduled and not started.",
  })
  @ApiResponse({
    status: 200,
    description: "Tip published successfully",
    type: TipResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "EPL Weekend Acca",
          description: "Top picks for this weekend's Premier League matches",
          price: 10.5,
          totalOdds: 4.5,
          status: "PENDING",
          purchasesCount: 0,
          publishedAt: "2024-01-15T10:00:00Z",
          earliestMatchDate: "2024-01-15T15:00:00Z",
          createdAt: "2024-01-10T08:00:00Z",
          tipster: {
            id: "550e8400-e29b-41d4-a716-446655440001",
            displayName: "John Doe",
            avatarUrl: "https://example.com/avatar.png",
            isVerified: true,
            rating: 4.5,
            successRate: 75.5,
            totalTips: 150,
          },
        },
        message: "Tip published successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - validation failed (e.g., tip already published, no selections, matches too soon, invalid price)",
    schema: {
      examples: {
        alreadyPublished: {
          value: {
            statusCode: 400,
            message: "Tip is already published and available for purchase",
            success: false,
          },
        },
        noSelections: {
          value: {
            statusCode: 400,
            message: "Cannot publish tip: at least one selection is required",
            success: false,
          },
        },
        matchesTooSoon: {
          value: {
            statusCode: 400,
            message:
              "Cannot publish tip: 2 match(es) are less than 12 hours before their start time: match 550e8400-e29b-41d4-a716-446655440000 (starts at 2024-01-15T10:00:00Z), match 550e8400-e29b-41d4-a716-446655440001 (starts at 2024-01-15T11:00:00Z)",
            success: false,
          },
        },
        invalidPrice: {
          value: {
            statusCode: 400,
            message:
              "Price must be at least 1.0 USD for paid tips, or 0 for free tips",
            success: false,
          },
        },
        freeTipsDisabled: {
          value: {
            statusCode: 400,
            message:
              "Free tips are currently disabled. Please set a price for your tip.",
            success: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - user is not the tip owner or not a tipster",
    schema: {
      example: {
        statusCode: 403,
        message: "You can only publish your own tips",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not found - tip or matches not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
    schema: {
      example: {
        statusCode: 401,
        message: "Unauthorized",
        success: false,
      },
    },
  })
  async publishTip(
    @Param("id") tipId: string,
    @Request() req: any,
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.publishTip(tipId, userId);

    return ApiResponseClass.success(tip, "Tip published successfully");
  }

  @Post("purchase")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Purchase a tip/prediction",
    description:
      "Purchase a published tip. Validates that both buyer and tipster have bank account details set (required for escrow). Initiates payment using the specified payment gateway (defaults to PalmPay).",
  })
  @ApiResponse({
    status: 201,
    description: "Purchase initiated successfully",
    type: PurchaseTipResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          tipId: "550e8400-e29b-41d4-a716-446655440001",
          buyerId: "550e8400-e29b-41d4-a716-446655440002",
          amount: 10.5,
          status: "PENDING",
          paymentReference: "TXN123456789",
          paymentMethod: "mobile_money",
          paymentGateway: "palmpay",
          checkoutUrl: "https://payment.palmpay.com/checkout/...",
          transactionId: "PALM123456789",
          message: "Payment initiated successfully",
        },
        message: "Purchase initiated successfully",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - validation failed (e.g., missing bank details, tip not published, already purchased)",
    schema: {
      example: {
        statusCode: 400,
        message:
          "Cannot purchase tip: Please set your bank account details first.",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
    schema: {
      example: {
        statusCode: 401,
        message: "Unauthorized",
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Tip not found",
    schema: {
      example: {
        statusCode: 404,
        message: "Tip not found: 550e8400-e29b-41d4-a716-446655440000",
        success: false,
      },
    },
  })
  async purchaseTip(
    @Body() purchaseDto: PurchaseTipDto,
    @Request() req: ExpressRequest & { user?: { id: string } },
  ): Promise<ApiResponseClass<PurchaseTipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    if (!purchaseDto.tipId) {
      throw new BadRequestException("Tip ID is required in request body");
    }

    // Extract IP address from request
    const ipAddress = this.extractUserIP(req);

    const purchase = await this.tipsService.purchaseTip(
      purchaseDto.tipId,
      userId,
      purchaseDto,
      ipAddress,
    );

    const apiResponse = ApiResponseClass.success(
      purchase,
      "Purchase initiated successfully",
    );

    this.logger.debug(
      `Purchase endpoint returning: ${JSON.stringify(apiResponse)}`,
    );

    return apiResponse;
  }

  private extractUserIP(req: ExpressRequest): string {
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.headers["x-real-ip"]?.toString() ||
      req.headers["x-client-ip"]?.toString() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    return ip;
  }
}
