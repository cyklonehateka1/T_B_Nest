import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "../../../common/entities/payment.entity";
import {
  PaymentGateway,
  PaymentGatewayStatus,
} from "../../../common/entities/payment-gateway.entity";
import { GlobalPaymentMethod } from "../../../common/entities/global-payment-method.entity";
import {
  PaymentGatewayBase,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusRequest,
  PaymentStatusResponse,
  WebhookRequest,
  WebhookResponse,
} from "./payment-gateway-base";
import { PalmpayService } from "./palmpay/palmpay.service";
import {
  PaymentMethodHandling,
  PaymentMethodHandlingMode,
} from "../../../common/entities/payment-gateway.entity";
interface GatewayConfig {
  id: string;
  name: string;
  status: PaymentGatewayStatus;
  enabled: boolean;
  supportedMethods: string[];
  supportedCurrencies: string[];
  configuration: Record<string, any>;
  paymentMethodHandling?: PaymentMethodHandling;
}
@Injectable()
export class PaymentGatewayRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PaymentGatewayRegistryService.name);
  private readonly gatewayRegistry = new Map<string, PaymentGatewayBase>();
  private gatewayConfigs: Map<string, GatewayConfig> = new Map();
  constructor(
    @InjectRepository(PaymentGateway)
    private readonly paymentGatewayRepository: Repository<PaymentGateway>,
    @InjectRepository(GlobalPaymentMethod)
    private readonly globalPaymentMethodRepository: Repository<GlobalPaymentMethod>,
    private readonly palmpayService: PalmpayService,
    // Optional services - will be added when implemented
    // private readonly ogatewayService?: OGatewayService,
    // private readonly stripeService?: StripeService,
  ) {}
  async onModuleInit(): Promise<void> {
    this.logger.error(
      "=== onModuleInit called - Starting gateway initialization ===",
    );
    try {
      await this.initializeGateways();
      this.logger.error(
        "=== Gateway initialization completed successfully ===",
      );
    } catch (error) {
      this.logger.error(
        `=== CRITICAL ERROR in onModuleInit: ${error.message} ===`,
      );
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }
  private async initializeGateways(): Promise<void> {
    this.logger.error("=== Starting initializeGateways ===");
    try {
      this.logger.error("About to call loadGatewayConfigurations...");
      await this.loadGatewayConfigurations();
      this.logger.error("loadGatewayConfigurations completed successfully");
      // OGateway and Stripe will be registered when services are implemented
      // if (this.ogatewayService) {
      //   try {
      //     this.registerGateway("ogateway", this.ogatewayService);
      //   } catch (error) {
      //     this.logger.error(
      //       `Failed to register OGateway: ${error.message}`,
      //       error.stack,
      //     );
      //   }
      // }
      // if (this.stripeService) {
      //   try {
      //     this.registerGateway("stripe", this.stripeService);
      //   } catch (error) {
      //     this.logger.error(
      //       `Failed to register Stripe gateway: ${error.message}`,
      //       error.stack,
      //     );
      //   }
      // }
      if (this.palmpayService) {
        try {
          this.registerGateway("palmpay", this.palmpayService);
        } catch (error) {
          this.logger.error(
            `Failed to register Palmpay gateway: ${error.message}`,
            error.stack,
          );
        }
      }
      this.logger.error(
        `Initialized ${this.gatewayRegistry.size} payment gateways: ${Array.from(this.gatewayRegistry.keys()).join(", ")}`,
      );
      this.logger.error("=== Completed initializeGateways ===");
    } catch (error) {
      this.logger.error(
        `=== FAILED to initialize gateways: ${error.message} ===`,
      );
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }
  private async loadGatewayConfigurations(): Promise<void> {
    try {
      this.logger.error("=== STARTING loadGatewayConfigurations ===");
      this.logger.error("Fetching gateways from database...");
      const gateways = await this.paymentGatewayRepository.find({
        relations: ["globalPaymentMethods"],
      });
      this.logger.error(`Found ${gateways.length} gateways in database`);
      if (gateways.length === 0) {
        this.logger.error("WARNING: No gateways found in database!");
        return;
      }
      this.gatewayConfigs.clear();
      for (const gateway of gateways) {
        const supportedMethods =
          gateway.globalPaymentMethods?.map((gpm) => gpm.type) || [];
        const config: GatewayConfig = {
          id: gateway.id,
          name: gateway.name,
          status: gateway.status,
          enabled: gateway.status === PaymentGatewayStatus.ACTIVE,
          supportedMethods,
          supportedCurrencies: [],
          configuration: gateway.configuration || {},
          paymentMethodHandling: gateway.paymentMethodHandling || {},
        };
        this.logger.error(`Loading gateway configuration:`, {
          id: gateway.id,
          name: gateway.name,
          status: gateway.status,
          paymentMethodHandling: gateway.paymentMethodHandling,
          rawPaymentMethodHandling: JSON.stringify(
            gateway.paymentMethodHandling,
          ),
          supportedMethods,
        });
        const gatewayNameLower = gateway.name.toLowerCase();
        this.gatewayConfigs.set(gatewayNameLower, config);
        this.gatewayConfigs.set(gateway.id, config);
        let serviceId: string | null = null;
        if (gatewayNameLower.includes("palmpay")) {
          serviceId = "palmpay";
        } else if (gatewayNameLower.includes("ogateway")) {
          serviceId = "ogateway";
        } else if (gatewayNameLower.includes("stripe")) {
          serviceId = "stripe";
        } else if (gatewayNameLower.includes("paypal")) {
          serviceId = "paypal";
        }
        if (serviceId) {
          this.gatewayConfigs.set(serviceId, config);
        }
      }
    } catch (error) {
      this.logger.error(
        `=== ERROR in loadGatewayConfigurations: ${error.message} ===`,
      );
      this.logger.error(`Error stack: ${error.stack}`);
      throw error;
    }
  }
  registerGateway(gatewayId: string, gateway: PaymentGatewayBase): void {
    const normalizedGatewayId = gatewayId.toLowerCase();
    let config = this.gatewayConfigs.get(normalizedGatewayId);
    if (!config) {
      for (const [key, value] of this.gatewayConfigs.entries()) {
        if (value.name.toLowerCase() === normalizedGatewayId) {
          config = value;
          break;
        }
      }
    }
    if (!config) {
      const availableConfigKeys = Array.from(this.gatewayConfigs.keys()).join(
        ", ",
      );
      this.logger.error(
        `Gateway configuration not found for ${gatewayId}. Available configs: ${availableConfigKeys || "none"}`,
      );
      throw new BadRequestException(
        `Gateway configuration not found for ${gatewayId}. Please ensure the gateway exists in the database.`,
      );
    }
    if (!gateway.validateConfiguration()) {
      this.logger.warn(
        `Gateway ${gatewayId} configuration validation failed. Gateway may not work properly. Check environment variables.`,
      );
    }
    if (this.gatewayRegistry.has(normalizedGatewayId)) {
      this.logger.warn(
        `Gateway ${normalizedGatewayId} is already registered. Overwriting...`,
      );
    }
    this.gatewayRegistry.set(normalizedGatewayId, gateway);
  }
  getGateway(gatewayId: string): PaymentGatewayBase {
    const normalizedGatewayId = gatewayId.toLowerCase();
    let gateway = this.gatewayRegistry.get(gatewayId);
    if (!gateway) {
      for (const [key, value] of this.gatewayRegistry.entries()) {
        if (key.toLowerCase() === normalizedGatewayId) {
          gateway = value;
          break;
        }
      }
    }
    if (!gateway) {
      let config = this.gatewayConfigs.get(normalizedGatewayId);
      if (!config) {
        for (const [key, value] of this.gatewayConfigs.entries()) {
          if (value.name.toLowerCase() === normalizedGatewayId) {
            config = value;
            break;
          }
        }
      }
      if (config) {
        const configNameLower = config.name.toLowerCase();
        for (const [key, value] of this.gatewayRegistry.entries()) {
          if (key.toLowerCase() === configNameLower) {
            gateway = value;
            break;
          }
        }
        if (!gateway) {
          this.logger.warn(
            `Gateway ${gatewayId} found in DB but not registered. Attempting registration...`,
          );
          if (configNameLower.includes("palmpay")) {
            gateway = this.palmpayService;
          }
          // OGateway and Stripe will be added when services are implemented
          // else if (configNameLower.includes("ogateway")) {
          //   gateway = this.ogatewayService;
          // } else if (configNameLower.includes("stripe")) {
          //   gateway = this.stripeService;
          // }
          if (gateway) {
            try {
              this.registerGateway(normalizedGatewayId, gateway);
              gateway = this.gatewayRegistry.get(normalizedGatewayId);
            } catch (registerError) {
              this.logger.error(
                `Failed to register gateway ${gatewayId}: ${registerError.message}`,
              );
            }
          }
        }
      }
    }
    if (!gateway) {
      const availableGateways = Array.from(this.gatewayRegistry.keys()).join(
        ", ",
      );
      const availableConfigs = Array.from(this.gatewayConfigs.keys())
        .map((key) => {
          const config = this.gatewayConfigs.get(key);
          return config ? config.name : key;
        })
        .join(", ");
      this.logger.error(
        `Gateway ${gatewayId} not found. Available gateways: ${availableGateways || "none"}. Available configs: ${availableConfigs || "none"}`,
      );
      throw new BadRequestException(
        `Payment gateway ${gatewayId} not found or not registered`,
      );
    }
    return gateway;
  }
  isGatewayAvailable(gatewayId: string): boolean {
    const config = this.gatewayConfigs.get(gatewayId.toLowerCase());
    return Boolean(config?.enabled && this.gatewayRegistry.has(gatewayId));
  }
  getAvailableGateways(): string[] {
    return Array.from(this.gatewayRegistry.keys()).filter((gatewayId) =>
      this.isGatewayAvailable(gatewayId),
    );
  }
  getGatewaysForPaymentMethod(paymentMethod: string): string[] {
    return Array.from(this.gatewayRegistry.keys()).filter((gatewayId) => {
      const config = this.gatewayConfigs.get(gatewayId.toLowerCase());
      return (
        config?.enabled &&
        this.gatewayRegistry.has(gatewayId) &&
        config.supportedMethods.includes(paymentMethod)
      );
    });
  }
  getGatewaysForCurrency(currency: string): string[] {
    return Array.from(this.gatewayRegistry.keys()).filter((gatewayId) => {
      const config = this.gatewayConfigs.get(gatewayId.toLowerCase());
      return (
        config?.enabled &&
        this.gatewayRegistry.has(gatewayId) &&
        config.supportedCurrencies.includes(currency)
      );
    });
  }
  async initiatePayment(
    gatewayId: string,
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    this.logger.log(`=== PaymentGatewayRegistry.initiatePayment called ===`);
    this.logger.log(`Gateway ID: ${gatewayId}`);
    this.logger.log(`Request: ${JSON.stringify(request, null, 2)}`);
    // eslint-disable-next-line no-console
    console.log(`=== PaymentGatewayRegistry.initiatePayment called ===`);
    // eslint-disable-next-line no-console
    console.log(`Gateway ID: ${gatewayId}`);
    // eslint-disable-next-line no-console
    console.log(`Request: ${JSON.stringify(request, null, 2)}`);

    const gateway = this.getGateway(gatewayId);
    this.logger.log(`Got gateway: ${gateway.getGatewayName()}`);
    // eslint-disable-next-line no-console
    console.log(`Got gateway: ${gateway.getGatewayName()}`);

    const supportedMethods = gateway.getSupportedPaymentMethods();
    this.logger.log(`Supported methods: ${supportedMethods.join(", ")}`);
    // eslint-disable-next-line no-console
    console.log(`Supported methods: ${supportedMethods.join(", ")}`);

    if (!supportedMethods.includes(request.paymentMethod)) {
      this.logger.error(
        `Payment method ${request.paymentMethod} not supported by gateway ${gatewayId}`,
      );
      throw new BadRequestException(
        `Payment method ${request.paymentMethod} not supported by gateway ${gatewayId}`,
      );
    }

    const supportedCurrencies = gateway.getSupportedCurrencies();
    this.logger.log(`Supported currencies: ${supportedCurrencies.join(", ")}`);
    // eslint-disable-next-line no-console
    console.log(`Supported currencies: ${supportedCurrencies.join(", ")}`);

    if (!supportedCurrencies.includes(request.currency)) {
      this.logger.error(
        `Currency ${request.currency} not supported by gateway ${gatewayId}`,
      );
      throw new BadRequestException(
        `Currency ${request.currency} not supported by gateway ${gatewayId}`,
      );
    }

    try {
      this.logger.log(`Calling gateway.initiatePayment(...)`);
      // eslint-disable-next-line no-console
      console.log(`Calling gateway.initiatePayment(...)`);
      const response = await gateway.initiatePayment(request);
      this.logger.log(
        `Gateway returned response: ${JSON.stringify(response, null, 2)}`,
      );
      // eslint-disable-next-line no-console
      console.log(
        `Gateway returned response: ${JSON.stringify(response, null, 2)}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Payment initiation failed with gateway ${gatewayId}: ${error.message}`,
      );
      // eslint-disable-next-line no-console
      console.error(
        `Payment initiation failed with gateway ${gatewayId}: ${error.message}`,
      );
      // eslint-disable-next-line no-console
      console.error(`Error stack:`, error.stack);
      throw error;
    }
  }
  async checkPaymentStatus(
    gatewayId: string,
    request: PaymentStatusRequest,
  ): Promise<PaymentStatusResponse> {
    const gateway = this.getGateway(gatewayId);
    try {
      const response = await gateway.checkPaymentStatus(request);
      return response;
    } catch (error) {
      this.logger.error(
        `Payment status check failed with gateway ${gatewayId}: ${error.message}`,
      );
      throw error;
    }
  }
  async handleWebhook(
    gatewayId: string,
    request: WebhookRequest,
  ): Promise<WebhookResponse> {
    const gateway = this.getGateway(gatewayId);
    try {
      const response = await gateway.handleWebhook(request);
      return response;
    } catch (error) {
      this.logger.error(
        `Webhook handling failed from gateway ${gatewayId}: ${error.message}`,
      );
      throw error;
    }
  }
  getGatewayConfig(gatewayId: string): GatewayConfig | undefined {
    const normalizedId = gatewayId.toLowerCase();
    this.logger.log(
      `Looking up gateway config for: ${gatewayId} (normalized: ${normalizedId})`,
    );
    this.logger.log(
      `Available config keys: ${Array.from(this.gatewayConfigs.keys()).join(", ")}`,
    );
    const config = this.gatewayConfigs.get(normalizedId);
    if (config) {
      this.logger.log(`Found config by direct lookup: ${normalizedId}`);
      return config;
    }
    for (const [key, value] of this.gatewayConfigs.entries()) {
      if (value.name.toLowerCase() === normalizedId) {
        this.logger.log(`Found config by name match: ${key} -> ${value.name}`);
        return value;
      }
    }
    for (const [key, value] of this.gatewayConfigs.entries()) {
      const configNameLower = value.name.toLowerCase();
      if (
        configNameLower.includes(normalizedId) ||
        normalizedId.includes(configNameLower)
      ) {
        this.logger.log(
          `Found config by partial name match: ${key} -> ${value.name}`,
        );
        return value;
      }
    }
    this.logger.warn(`No gateway config found for: ${gatewayId}`);
    return undefined;
  }
  async refreshGatewayConfigurations(): Promise<void> {
    this.logger.log("Refreshing gateway configurations from database...");
    await this.loadGatewayConfigurations();
    this.logger.log("Gateway configurations refreshed successfully");
  }
  getAllGatewayConfigs(): Map<string, GatewayConfig> {
    return new Map(this.gatewayConfigs);
  }
  getPaymentMethodHandlingMode(
    gatewayId: string,
    paymentMethod: string,
  ): PaymentMethodHandlingMode {
    const config = this.getGatewayConfig(gatewayId);
    if (!config) {
      this.logger.warn(
        `Gateway config not found for ${gatewayId}, defaulting to direct`,
      );
      return PaymentMethodHandlingMode.DIRECT;
    }
    if (!config.paymentMethodHandling) {
      this.logger.warn(
        `No paymentMethodHandling config for gateway ${gatewayId}, defaulting to direct`,
      );
      return PaymentMethodHandlingMode.DIRECT;
    }
    if (
      typeof config.paymentMethodHandling !== "object" ||
      Array.isArray(config.paymentMethodHandling)
    ) {
      this.logger.error(
        `Invalid paymentMethodHandling type for gateway ${gatewayId}. Expected object, got: ${typeof config.paymentMethodHandling}`,
        { paymentMethodHandling: config.paymentMethodHandling },
      );
      return PaymentMethodHandlingMode.DIRECT;
    }
    const handlingMode = config.paymentMethodHandling[paymentMethod];
    this.logger.log(`Payment method handling mode lookup:`, {
      gatewayId,
      paymentMethod,
      handlingMode: handlingMode || "direct (default)",
      availablePaymentMethods: Object.keys(config.paymentMethodHandling),
      fullPaymentMethodHandling: config.paymentMethodHandling,
      paymentMethodHandlingType: typeof config.paymentMethodHandling,
    });
    if (handlingMode) {
      if (
        handlingMode !== PaymentMethodHandlingMode.CHECKOUT_URL &&
        handlingMode !== PaymentMethodHandlingMode.DIRECT
      ) {
        this.logger.warn(
          `Invalid handling mode value "${String(handlingMode)}" for ${gatewayId}/${paymentMethod}. Expected "checkout_url" or "direct". Defaulting to direct.`,
        );
        return PaymentMethodHandlingMode.DIRECT;
      }
      return handlingMode;
    }
    this.logger.warn(
      `No handling mode found for payment method "${paymentMethod}" on gateway ${gatewayId}. Available methods: ${Object.keys(config.paymentMethodHandling).join(", ")}. Defaulting to direct.`,
    );
    return PaymentMethodHandlingMode.DIRECT;
  }
  usesCheckoutUrl(gatewayId: string, paymentMethod: string): boolean {
    return (
      this.getPaymentMethodHandlingMode(gatewayId, paymentMethod) ===
      PaymentMethodHandlingMode.CHECKOUT_URL
    );
  }
  handlesDirectly(gatewayId: string, paymentMethod: string): boolean {
    return (
      this.getPaymentMethodHandlingMode(gatewayId, paymentMethod) ===
      PaymentMethodHandlingMode.DIRECT
    );
  }
}
