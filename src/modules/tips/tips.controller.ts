import { Controller, Get, Post, Query, Body, Request, UseGuards } from "@nestjs/common";
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
import { CreateTipDto } from "./dto/create-tip.dto";
import { ApiResponse as ApiResponseClass } from "../../common/dto/api-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../modules/auth/guards/roles.guard";
import { Roles } from "../../modules/auth/decorators/roles.decorator";
import { UserRoleType } from "../../common/enums/user-role-type.enum";

@ApiTags("Tips")
@Controller("tips")
export class TipsController {
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
    @Query("size") size?: number
  ): Promise<ApiResponseClass<TipsPageResponseDto>> {
    // Parse page and size with defaults
    const pageNum = page !== undefined ? Number(page) : 0;
    const pageSize = size !== undefined ? Number(size) : 20;

    // Parse minPrice and maxPrice
    const minPriceNum = minPrice !== undefined ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice !== undefined ? Number(maxPrice) : undefined;

    // Parse isFree boolean
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
      pageSize
    );

    return ApiResponseClass.success(response, "Tips retrieved successfully");
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
    @Request() req: any
  ): Promise<ApiResponseClass<TipResponseDto>> {
    const userId = req.user?.id;

    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const tip = await this.tipsService.createTip(createTipDto, userId);

    return ApiResponseClass.success(tip, "Tip created successfully");
  }
}
