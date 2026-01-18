import { ApiProperty } from "@nestjs/swagger";

export class ProfileResponseDto {
  @ApiProperty({
    description: "User ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "User email",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "First name",
    example: "John",
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: "Last name",
    example: "Doe",
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: "Display name",
    example: "JohnDoe",
    required: false,
  })
  displayName?: string;

  @ApiProperty({
    description: "Phone number",
    example: "+1234567890",
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: "Avatar URL",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  avatarUrl?: string;

  @ApiProperty({
    description: "About me / Bio",
    example: "I am a passionate football tipster with years of experience...",
    required: false,
  })
  aboutMe?: string;

  @ApiProperty({
    description: "Whether the user is verified",
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: "Email verified at timestamp",
    required: false,
  })
  emailVerifiedAt?: Date;

  @ApiProperty({
    description: "Last login timestamp",
    required: false,
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: "Account creation timestamp",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
  })
  updatedAt: Date;

  @ApiProperty({
    description: "Account number for bank transfers",
    required: false,
  })
  accountNumber?: string;

  @ApiProperty({
    description: "Account name for bank transfers",
    required: false,
  })
  accountName?: string;

  @ApiProperty({
    description: "Bank code",
    required: false,
  })
  bankCode?: string;

  @ApiProperty({
    description: "Bank name",
    required: false,
  })
  bankName?: string;

  @ApiProperty({
    description: "User roles",
    example: ["CUSTOMER", "TIPSTER"],
    type: [String],
  })
  roles: string[];

  // Tipster-specific fields (only present if user is a tipster)
  @ApiProperty({
    description: "Tipster rating (0-100)",
    example: 85.5,
    required: false,
  })
  rating?: number;

  @ApiProperty({
    description: "Tipster success rate percentage",
    example: 72.5,
    required: false,
  })
  successRate?: number;

  @ApiProperty({
    description: "Total number of tips published",
    example: 150,
    required: false,
  })
  totalTips?: number;

  @ApiProperty({
    description: "Number of successful tips",
    example: 109,
    required: false,
  })
  successfulTips?: number;
}
